#!/usr/bin/env bash
# Deploy Tutor to your own AWS account. Run it in AWS CloudShell (AWS CLI v2,
# jq and the Session Manager plugin are preinstalled) or in any shell with
# admin credentials for the target account. See deploy/aws/README.md.
#
#   deploy.sh up [--ref REF] [--domain NAME] [--email ADDR] [--budget USD] [--size TYPE] [--disk GIB]
#                           create the stack, or update it with the given options
#   deploy.sh release [REF] build and roll out a revision (default: the stack's GitRef)
#   deploy.sh secrets       set or rotate the API keys, then apply them
#   deploy.sh set NAME      set any other server setting from .env.example, then apply it
#   deploy.sh unset NAME    remove a server setting, then apply it
#   deploy.sh apply         re-apply settings and the site address without changing the code
#   deploy.sh status        stack, instance and health at a glance
#   deploy.sh logs [ARGS]   follow the app log (extra args go to "aws logs tail")
#   deploy.sh bootlog       show the first-boot log from the instance
#   deploy.sh shell         open a root shell on the instance (Session Manager)
#   deploy.sh down          delete the stack (a final snapshot of the data volume is kept)
#
# Environment: STACK (default "tutor"), AWS_REGION (CloudShell sets it to the
# console's region).
set -euo pipefail

STACK=${STACK:-tutor}
REGION=${AWS_REGION:-${AWS_DEFAULT_REGION:-$(aws configure get region 2>/dev/null || true)}}
HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
TEMPLATE="$HERE/template.yaml"
PARAMS="/tutor/$STACK"
UBUNTU_AMI_PARAM=/aws/service/canonical/ubuntu/server/24.04/stable/current/arm64/hvm/ebs-gp3/ami-id

say() { printf '\033[1m%s\033[0m\n' "$*"; }
warn() { printf '\033[33m%s\033[0m\n' "$*" >&2; }
die() {
  printf '\033[31m%s\033[0m\n' "$*" >&2
  exit 1
}

usage() { sed -n '2,/^set -euo/p' "$0" | sed '$d' | sed 's/^# \{0,1\}//'; }
case ${1:-help} in help | -h | --help) usage && exit 0 ;; esac

need() { command -v "$1" >/dev/null || die "Missing '$1'. Run this in AWS CloudShell, or install it first."; }
need aws
need jq
need curl
[ -n "$REGION" ] || die "No AWS region. Pick one in the console before opening CloudShell, or export AWS_REGION."
[[ $STACK =~ ^[A-Za-z][A-Za-z0-9-]{0,30}$ ]] || die "STACK must be letters, digits and hyphens (max 31)."
export AWS_REGION=$REGION AWS_PAGER=""

# ------------------------------------------------------------------ helpers
stack_status() {
  aws cloudformation describe-stacks --stack-name "$STACK" --query 'Stacks[0].StackStatus' --output text 2>/dev/null || echo NONE
}
output() {
  aws cloudformation describe-stacks --stack-name "$STACK" \
    --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" --output text
}
require_stack() {
  case $(stack_status) in
    NONE) die "Stack '$STACK' does not exist in $REGION. Run: $0 up" ;;
    *_IN_PROGRESS) die "Stack '$STACK' is busy ($(stack_status)). Try again in a minute." ;;
  esac
}
param_exists() {
  aws ssm get-parameter --name "$PARAMS/$1" --query Parameter.Name --output text >/dev/null 2>&1
}
# Stores a setting as a SecureString. The value travels in a private temp file,
# never on a command line.
put_param() {
  local file
  file=$(mktemp)
  chmod 600 "$file"
  NAME="$PARAMS/$1" VALUE="$2" jq -n '{Name: env.NAME, Value: env.VALUE, Type: "SecureString", Overwrite: true}' >"$file"
  aws ssm put-parameter --cli-input-json "file://$file" >/dev/null
  rm -f "$file"
}
prompt_secret() { # name, label -> sets REPLY ("" keeps the current value)
  local current="not set"
  param_exists "$1" && current="set; Enter keeps it"
  read -r -s -p "$2 [$current]: " REPLY
  echo
}

# Runs a shell command on the instance through SSM Run Command. Output streams
# live from CloudWatch Logs and is printed again if streaming is unavailable.
run_on_host() { # command, timeout-seconds
  local instance command_id status
  instance=$(output InstanceId)
  command_id=$(aws ssm send-command --instance-ids "$instance" --document-name AWS-RunShellScript \
    --comment "tutor: ${1:0:90}" --timeout-seconds 600 \
    --cloud-watch-output-config "CloudWatchOutputEnabled=true,CloudWatchLogGroupName=$(output LogGroupName)" \
    --parameters "$(jq -n --arg c "$1" --arg t "$2" '{commands: [$c], executionTimeout: [$t]}')" \
    --query Command.CommandId --output text)
  aws logs tail "$(output LogGroupName)" --log-stream-name-prefix "$command_id" --follow --format short 2>/dev/null &
  local tail_pid=$!
  status=Pending
  while [[ $status =~ ^(Pending|InProgress|Delayed|NotStarted|)$ ]]; do
    sleep 5
    status=$(aws ssm get-command-invocation --command-id "$command_id" --instance-id "$instance" \
      --query Status --output text 2>/dev/null || echo Pending)
  done
  sleep 6
  kill "$tail_pid" 2>/dev/null || true
  wait "$tail_pid" 2>/dev/null || true
  if [ "$status" != Success ]; then
    aws ssm get-command-invocation --command-id "$command_id" --instance-id "$instance" \
      --query '[StandardOutputContent, StandardErrorContent]' --output text | tail -n 60
    die "Command finished with status $status."
  fi
}

# Health of the server itself. Connects straight to the Elastic IP, so a
# DNS record that is missing (or negatively cached for up to 30 minutes)
# cannot hide a healthy site.
site_healthy() {
  local url host
  url=$(output Url)
  host=${url#https://}
  curl -fsS --max-time 10 --resolve "$host:443:$(output PublicIp)" "$url/api/health" >/dev/null 2>&1
}

# What public DNS says about a custom domain: ok | missing | <other address>.
# Asks the zone's authoritative server when dig is available (no caching).
dns_status() { # host, expected-ip
  local answer ns
  if command -v dig >/dev/null; then
    ns=$(dig +short NS "${1#*.}" 2>/dev/null | head -n 1 || true)
    answer=$(dig +short A "$1" ${ns:+@"$ns"} 2>/dev/null | grep -E '^[0-9.]+$' | head -n 1 || true)
  else
    answer=$(getent ahostsv4 "$1" 2>/dev/null | awk 'NR == 1 {print $1}' || true)
  fi
  if [ -z "$answer" ]; then echo missing; elif [ "$answer" = "$2" ]; then echo ok; else echo "$answer"; fi
}

dns_advice() { # host, expected-ip, status
  case $3 in
    ok) say "DNS: $1 -> $2 (ok)" ;;
    missing) warn "DNS: $1 has no A record yet. Add: type A, name ${1%%.*}, value $2, DNS only (grey cloud)." ;;
    *) warn "DNS: $1 points to $3, not $2. In Cloudflare, set the record's value to $2 and Proxy status to DNS only." ;;
  esac
}

wait_for_site() { # minutes, [custom domain]
  local deadline=$((SECONDS + $1 * 60)) ip dns="" last=""
  ip=$(output PublicIp)
  printf 'Waiting for %s ' "$(output Url)"
  until site_healthy; do
    if [ -n "${2:-}" ]; then
      dns=$(dns_status "$2" "$ip")
      if [ "$dns" != "$last" ]; then
        echo
        dns_advice "$2" "$ip" "$dns"
        last=$dns
      fi
    fi
    if ((SECONDS > deadline)); then
      echo
      warn "Not up after $1 minutes. See what the instance is doing: $0 bootlog"
      return 1
    fi
    printf '.'
    sleep 10
  done
  echo " up."
}

custom_domain() { # prints the stack's custom domain, if any
  local host
  host=$(output Url)
  host=${host#https://}
  [[ $host == *.sslip.io ]] || echo "$host"
}

# ------------------------------------------------------------------ commands
cmd_secrets() {
  say "API keys are SecureString parameters under $PARAMS/ (KMS-encrypted; only the Tutor instance role can read them)."
  prompt_secret ZAI_API_KEY "Z.AI API key"
  [ -n "$REPLY" ] && put_param ZAI_API_KEY "$REPLY"
  param_exists ZAI_API_KEY || warn "No Z.AI key: the tutor will answer with the offline mock model."

  echo "Z.AI endpoint: 1) pay-as-you-go (default)  2) GLM Coding Plan"
  read -r -p "Choose [Enter keeps the current one]: " choice
  case $choice in
    1) put_param ZAI_BASE_URL https://api.z.ai/api/paas/v4 ;;
    2)
      warn "Z.AI's Coding Plan terms limit the plan to supported coding tools and one user."
      warn "A site other people use needs a pay-as-you-go key."
      put_param ZAI_BASE_URL https://api.z.ai/api/coding/paas/v4
      ;;
  esac

  prompt_secret DEEPGRAM_API_KEY "Deepgram API key (server voice; empty keeps browser speech)"
  [ -n "$REPLY" ] && put_param DEEPGRAM_API_KEY "$REPLY"

  # The site is public: the app has no access code, so anyone with the URL can use it.
}

cmd_up() {
  local ref="" domain="" email="" budget="" size="" disk=""
  while (($#)); do
    case $1 in
      --ref) ref=$2 ;;
      --domain) domain=$2 ;;
      --email) email=$2 ;;
      --budget) budget=$2 ;;
      --size) size=$2 ;;
      --disk) disk=$2 ;;
      *) die "Unknown option $1 (see the header of $0)" ;;
    esac
    shift 2
  done

  local status overrides=()
  status=$(stack_status)
  case $status in
    *_IN_PROGRESS) die "Stack '$STACK' is busy ($status). Try again in a minute." ;;
    ROLLBACK_COMPLETE | ROLLBACK_FAILED)
      die "The first create of '$STACK' failed. Check the Events tab in the CloudFormation console, then run '$0 down' and retry."
      ;;
  esac

  if [ "$status" = NONE ]; then
    say "Creating stack '$STACK' in $REGION."
    param_exists ZAI_API_KEY || cmd_secrets
    size=${size:-t4g.small}
    if [ -z "$ref" ]; then
      ref=$(git -C "$HERE" rev-parse --abbrev-ref HEAD 2>/dev/null || echo main)
      git -C "$HERE" ls-remote --exit-code --heads origin "$ref" >/dev/null 2>&1 || ref=main
    fi
    local ami zone
    ami=$(aws ssm get-parameter --name "$UBUNTU_AMI_PARAM" --query Parameter.Value --output text)
    zone=$(aws ec2 describe-instance-type-offerings --location-type availability-zone \
      --filters "Name=instance-type,Values=$size" --query 'InstanceTypeOfferings[].Location' --output text |
      tr '\t' '\n' | sort | head -n 1)
    [ -n "$zone" ] || die "$size is not offered in $REGION."
    say "Ubuntu 24.04 arm64 $ami, $size in $zone, deploying '$ref'."
    overrides+=("ImageId=$ami" "AvailabilityZone=$zone" "InstanceType=$size" "GitRef=$ref")
  else
    if [ -n "$size" ]; then
      overrides+=("InstanceType=$size")
      warn "Changing the instance type stops and starts the instance (about a minute of downtime)."
    fi
    if [ -n "$ref" ]; then overrides+=("GitRef=$ref"); fi
  fi
  [[ -z $ref || $ref =~ ^[A-Za-z0-9._/-]+$ ]] || die "Invalid git ref: $ref"
  if [ -n "$domain" ]; then overrides+=("DomainName=$domain"); fi
  if [ -n "$email" ]; then overrides+=("AlertEmail=$email"); fi
  if [ -n "$budget" ]; then overrides+=("MonthlyBudgetUsd=$budget"); fi
  if [ -n "$disk" ]; then overrides+=("DataVolumeSize=$disk"); fi

  local args=(--stack-name "$STACK" --template-file "$TEMPLATE" --capabilities CAPABILITY_IAM
    --no-fail-on-empty-changeset --tags app=tutor "stack=$STACK")
  if ((${#overrides[@]})); then args+=(--parameter-overrides "${overrides[@]}"); fi
  aws cloudformation deploy "${args[@]}"

  local url
  url=$(output Url)
  if [ "$status" = NONE ]; then
    say "Infrastructure is ready. The instance is now installing Docker and building the app (about 10-15 minutes)."
    if [ -n "$domain" ]; then
      say "Add this DNS record now (Cloudflare: DNS > Records > Add record), before opening the site:"
      echo "  Type A   Name ${domain%%.*}   IPv4 $(output PublicIp)   Proxy status: DNS only (grey cloud)"
      echo "The certificate is issued automatically once the record resolves."
    fi
    wait_for_site 30 "$domain" || exit 1
  elif [ -n "$domain" ]; then
    say "Add or update this DNS record, then switch the site over with '$0 apply':"
    echo "  Type A   Name ${domain%%.*}   IPv4 $(output PublicIp)   Proxy status: DNS only (grey cloud)"
    return
  fi
  say "Tutor is live: $url"
}

cmd_release() {
  require_stack
  local ref=${1:-}
  [[ -z $ref || $ref =~ ^[A-Za-z0-9._/-]+$ ]] || die "Invalid git ref: $ref"
  say "Releasing ${ref:-the default GitRef} on $(output InstanceId). The host builds it, health-checks it and rolls back on failure."
  run_on_host "/usr/local/sbin/tutor-release $ref" 3000
  report_health
}

cmd_apply() {
  require_stack
  say "Applying settings and the site address to the running release."
  run_on_host "/usr/local/sbin/tutor-release --settings-only" 900
  report_health
}

report_health() {
  local domain
  domain=$(custom_domain)
  if site_healthy; then
    say "Healthy: $(output Url)"
  else
    warn "$(output Url) is not answering yet (a new certificate can take a minute)."
  fi
  if [ -n "$domain" ] && [ "$(dns_status "$domain" "$(output PublicIp)")" != ok ]; then
    dns_advice "$domain" "$(output PublicIp)" "$(dns_status "$domain" "$(output PublicIp)")"
  fi
}

cmd_set() {
  require_stack
  local name=${1:-}
  [[ $name =~ ^[A-Z][A-Z0-9_]*$ ]] || die "Usage: $0 set NAME   (NAME from .env.example, e.g. USER_REQUESTS_PER_MINUTE)"
  read -r -s -p "Value for $name: " REPLY
  echo
  put_param "$name" "$REPLY"
  cmd_apply
}

cmd_unset() {
  require_stack
  local name=${1:-}
  [[ $name =~ ^[A-Z][A-Z0-9_]*$ ]] || die "Usage: $0 unset NAME   (NAME from .env.example)"
  if param_exists "$name"; then
    aws ssm delete-parameter --name "$PARAMS/$name" >/dev/null
    say "Removed $name."
  else
    say "$name is not set."
  fi
  cmd_apply
}

cmd_status() {
  local status
  status=$(stack_status)
  echo "Stack     $STACK ($REGION): $status"
  [ "$status" = NONE ] && return
  local url instance
  url=$(output Url)
  instance=$(output InstanceId)
  echo "URL       $url"
  echo "Instance  $instance $(aws ec2 describe-instances --instance-ids "$instance" \
    --query 'Reservations[0].Instances[0].[InstanceType, State.Name]' --output text | tr '\t' ' ')"
  echo "Settings  $(aws ssm get-parameters-by-path --path "$PARAMS/" --query 'Parameters[].Name' --output text |
    tr '\t' '\n' | sed "s|$PARAMS/||" | paste -sd ' ' -)"
  if site_healthy; then echo "Health    ok"; else echo "Health    not responding"; fi
  local domain
  domain=$(custom_domain)
  if [ -n "$domain" ]; then echo "DNS       $(dns_status "$domain" "$(output PublicIp)") (expected A $(output PublicIp))"; fi
}

cmd_logs() {
  require_stack
  aws logs tail "$(output LogGroupName)" --log-stream-names app --follow --since 30m "$@"
}

cmd_bootlog() {
  require_stack
  run_on_host "tail -n 120 /var/log/tutor-bootstrap.log" 60
}

cmd_shell() {
  require_stack
  aws ssm start-session --target "$(output InstanceId)"
}

cmd_down() {
  require_stack
  warn "This deletes the instance, network and Elastic IP of '$STACK' in $REGION."
  warn "The data volume is kept as a final EBS snapshot; daily snapshots expire on their own schedule."
  read -r -p "Type the stack name to confirm: " answer
  [ "$answer" = "$STACK" ] || die "Cancelled."
  aws cloudformation delete-stack --stack-name "$STACK"
  aws cloudformation wait stack-delete-complete --stack-name "$STACK"
  say "Stack deleted."
  read -r -p "Also delete the stored API keys under $PARAMS/? [y/N] " answer
  if [[ $answer =~ ^[Yy]$ ]]; then
    local names
    names=$(aws ssm get-parameters-by-path --path "$PARAMS/" --query 'Parameters[].Name' --output text)
    # shellcheck disable=SC2086 # Parameter names contain no spaces.
    [ -n "$names" ] && aws ssm delete-parameters --names $names >/dev/null
    say "Keys deleted."
  fi
}

command=${1:-help}
shift || true
case $command in
  up) cmd_up "$@" ;;
  release) cmd_release "$@" ;;
  secrets)
    cmd_secrets
    if [[ ! $(stack_status) =~ ^(NONE|.*_IN_PROGRESS)$ ]]; then cmd_apply; fi
    ;;
  apply) cmd_apply ;;
  set) cmd_set "$@" ;;
  unset) cmd_unset "$@" ;;
  status) cmd_status ;;
  logs) cmd_logs "$@" ;;
  bootlog) cmd_bootlog ;;
  shell) cmd_shell ;;
  down) cmd_down ;;
  *)
    usage
    exit 2
    ;;
esac

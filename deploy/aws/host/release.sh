#!/bin/bash
# Builds the checked-out revision and rolls it out on this host. If the new
# container is not healthy within about three minutes, the previous image is
# restored. Always run through tutor-release, which holds the release lock.
set -euo pipefail
export PATH="$PATH:/snap/bin"
# shellcheck source=/dev/null
source /opt/tutor/host.env
cd /opt/tutor/src
log() { echo "[tutor-release] $*"; }

imds() {
  local token
  token=$(curl -sf -X PUT -H 'X-aws-ec2-metadata-token-ttl-seconds: 60' http://169.254.169.254/latest/api/token) || return 1
  curl -sf -H "X-aws-ec2-metadata-token: $token" "http://169.254.169.254/latest/meta-data/$1"
}

revision=$(git rev-parse --short=12 HEAD)
image="tutor:$revision"
site=$(imds tags/instance/TutorSite)
previous=$(cat /opt/tutor/current-image 2>/dev/null || true)

# 1. Image. Built on the host from the public repository; reused if present.
if docker image inspect "$image" >/dev/null 2>&1; then
  log "image $image already built"
else
  log "building $image (a few minutes on a small instance)"
  docker build --pull --tag "$image" --label "org.opencontainers.image.revision=$(git rev-parse HEAD)" .
fi

# 2. Settings. Every parameter under /tutor/<stack>/ becomes an environment
#    variable. The file is readable by root only.
log "loading settings from SSM /tutor/$STACK_NAME/"
umask 077
aws ssm get-parameters-by-path --region "$AWS_REGION" --path "/tutor/$STACK_NAME/" --with-decryption --output json |
  jq -r '.Parameters[] | "\(.Name | split("/") | last)=\(.Value)"' >/opt/tutor/app.env.next
mv /opt/tutor/app.env.next /opt/tutor/app.env
umask 022
grep -q '^ZAI_API_KEY=.' /opt/tutor/app.env || log "warning: no ZAI_API_KEY; the tutor will answer with the offline mock model"

# 3. Data directory, owned by the image's unprivileged user.
uid=$(docker run --rm --entrypoint id "$image" -u)
gid=$(docker run --rm --entrypoint id "$image" -g)
if [ -d /srv/tutor-data/app ] && [ "$(stat -c %u /srv/tutor-data/app)" != "$uid" ]; then
  chown -R "$uid:$gid" /srv/tutor-data/app
fi
install -d -m 0750 -o "$uid" -g "$gid" /srv/tutor-data/app

# 4. Roll out, health-check, roll back on failure.
up() {
  TUTOR_IMAGE="$1" SITE_ADDRESS="$site" CADDYFILE_SHA="$(sha256sum deploy/aws/Caddyfile | cut -c1-16)" \
    docker compose --project-name tutor --file deploy/aws/compose.yml --env-file /opt/tutor/host.env \
    up --detach --remove-orphans
}
app_container() {
  docker ps -q --filter label=com.docker.compose.project=tutor --filter label=com.docker.compose.service=app
}
wait_healthy() {
  local status
  for _ in $(seq 1 60); do
    status=$(docker inspect -f '{{.State.Health.Status}}' "$(app_container)" 2>/dev/null || echo starting)
    case $status in
      healthy) return 0 ;;
      unhealthy) return 1 ;;
    esac
    sleep 3
  done
  return 1
}

log "rolling out $image at https://$site"
if up "$image" && wait_healthy; then
  echo "$image" >/opt/tutor/current-image
  log "healthy: $image"
else
  log "$image did not become healthy; last log lines:"
  docker logs --tail 80 "$(app_container)" 2>&1 || true
  if [ -n "$previous" ] && [ "$previous" != "$image" ]; then
    log "rolling back to $previous"
    if ! { up "$previous" && wait_healthy; }; then log "the previous image is not healthy either"; fi
  fi
  exit 1
fi

# 5. Housekeeping: keep the current and previous images, drop week-old build cache,
#    and pick up any change to the release wrapper itself.
docker image ls tutor --format '{{.Repository}}:{{.Tag}}' |
  grep -vxF -e "$image" -e "${previous:-none}" | xargs -r docker image rm -f >/dev/null 2>&1 || true
docker builder prune --force --filter until=168h >/dev/null 2>&1 || true
install -m 0755 deploy/aws/host/tutor-release /usr/local/sbin/tutor-release
log "done"

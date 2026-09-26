#!/bin/bash
# Host setup for the Tutor EC2 instance. User data runs it once on first
# boot; it is idempotent, so it is safe to re-run by hand over Session Manager.
# See deploy/aws/README.md.
set -euo pipefail
# shellcheck source=/dev/null
source /opt/tutor/host.env
export DEBIAN_FRONTEND=noninteractive
log() { echo "[tutor-bootstrap] $*"; }

# 1. Swap. The web build peaks around 1.6 GB, more than a t4g.small has spare
#    while the previous release keeps serving.
if ! swapon --show=NAME --noheadings | grep -qx /swapfile; then
  if [ ! -f /swapfile ]; then
    fallocate -l 4G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile >/dev/null
  fi
  swapon /swapfile
  grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >>/etc/fstab
fi
echo 'vm.swappiness=10' >/etc/sysctl.d/60-tutor.conf
sysctl -q -p /etc/sysctl.d/60-tutor.conf

# 2. Packages. Docker comes from Ubuntu's archive, so unattended-upgrades keeps
#    it patched. live-restore keeps containers running while dockerd upgrades.
log "installing Docker and the AWS CLI"
# First boot races apt-daily/unattended-upgrades for the dpkg lock: wait for it.
apt_get() { apt-get -o DPkg::Lock::Timeout=900 -q "$@"; }
apt_get update
apt_get install -y docker.io docker-compose-v2 docker-buildx jq
install -d -m 0755 /etc/docker
if [ ! -f /etc/docker/daemon.json ]; then
  echo '{ "live-restore": true }' >/etc/docker/daemon.json
fi
systemctl enable docker >/dev/null
systemctl restart docker
snap wait system seed.loaded
snap list aws-cli >/dev/null 2>&1 || snap install aws-cli --classic

# 3. Data volume: a separate EBS volume (with daily snapshots), so the instance
#    can be replaced without touching learner data.
device="/dev/disk/by-id/nvme-Amazon_Elastic_Block_Store_${DATA_VOLUME_ID/-/}"
for _ in $(seq 1 120); do
  [ -e "$device" ] && break
  sleep 5
done
if [ ! -e "$device" ]; then
  log "data volume $DATA_VOLUME_ID never attached"
  exit 1
fi
if [ -z "$(blkid -o value -s TYPE "$device" || true)" ]; then
  log "formatting new data volume $DATA_VOLUME_ID"
  mkfs.ext4 -q -L tutor-data "$device"
fi
install -d -m 0755 /srv/tutor-data
grep -q '^LABEL=tutor-data ' /etc/fstab ||
  echo 'LABEL=tutor-data /srv/tutor-data ext4 defaults,nofail,noatime 0 2' >>/etc/fstab
mountpoint -q /srv/tutor-data || mount /srv/tutor-data
# If the volume ever fails to mount, Docker stays down rather than letting the
# app write learner data to the root disk.
install -d -m 0755 /etc/systemd/system/docker.service.d
printf '[Unit]\nRequiresMountsFor=/srv/tutor-data\n' >/etc/systemd/system/docker.service.d/tutor-data.conf
systemctl daemon-reload
install -d -m 0700 /srv/tutor-data/caddy /srv/tutor-data/caddy/data /srv/tutor-data/caddy/config

# 4. Release tooling, then the first release.
install -m 0755 /opt/tutor/src/deploy/aws/host/tutor-release /usr/local/sbin/tutor-release
log "host ready; building the first release"
exec /usr/local/sbin/tutor-release

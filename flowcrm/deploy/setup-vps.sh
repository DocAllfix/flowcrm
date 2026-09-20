#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# Preparazione di una VPS nuova (Ubuntu 24.04) per UN'istanza FlowCRM.
#
# Idempotente: rieseguirlo non fa danni.
#   ssh root@<IP> 'bash -s' < deploy/setup-vps.sh
#
# Evoluzione di WhistleBlower/deploy/setup-vps.sh. Le differenze nascono
# tutte dal fatto che qui gira anche Supabase self-hostato: dieci container
# in più, quindi più RAM, più disco e più attenzione a cosa resta esposto.
# ═══════════════════════════════════════════════════════════════════
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

echo "=== FlowCRM — preparazione VPS ==="

echo "[1/7] aggiornamento sistema…"
apt-get update -q
apt-get upgrade -yq -o Dpkg::Options::=--force-confdef -o Dpkg::Options::=--force-confold

echo "[2/7] pacchetti…"
# restic: backup. jq: lo usa l'entrypoint per generare config.json.
# dnsutils: `dig` serve a preflight.sh per verificare la propagazione.
apt-get install -yq docker.io docker-compose-v2 git curl jq restic \
                    ufw fail2ban dnsutils openssl
systemctl enable --now docker

echo "[3/7] firewall UFW…"
# ATTENZIONE, e vale la pena rileggerlo ogni volta: i container Docker con
# porte pubblicate SCAVALCANO UFW, perché Docker scrive le proprie regole
# iptables a monte della catena di UFW. Questo firewall NON protegge una
# porta pubblicata per errore. La difesa vera è duplice:
#   1. il firewall CLOUD di Hetzner (fuori da questa macchina);
#   2. non pubblicare nulla oltre 80/443 — vedi la nota su `supavisor` in
#      deploy/docker-compose.flowcrm.yml.
# UFW resta come difesa in profondità per eventuali servizi sull'host.
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "[4/7] fail2ban…"
cat > /etc/fail2ban/jail.local <<'JAIL'
[sshd]
enabled  = true
maxretry = 5
findtime = 600
bantime  = 3600
JAIL
systemctl enable --now fail2ban
systemctl restart fail2ban

echo "[5/7] hardening SSH…"
# Solo se una chiave è GIÀ autorizzata: altrimenti ci si chiude fuori dalla
# macchina, e su una VPS remota non c'è una console da cui rimediare.
if [ -s /root/.ssh/authorized_keys ]; then
  sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
  sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config
  systemctl reload ssh
  echo "      accesso con password disabilitato (solo chiave)"
else
  echo "      ATTENZIONE: nessuna chiave in /root/.ssh/authorized_keys — password lasciata attiva"
fi

echo "[6/7] swap 4 GB…"
# Il doppio di WhistleVault: lo stack Supabase a regime occupa gran parte
# degli 8 GB, e senza swap un picco di Postgres fa intervenire l'OOM killer
# — che sceglie la vittima da sé, e spesso è proprio il database.
if [ ! -f /swapfile ]; then
  fallocate -l 4G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  # Con 8 GB di RAM conviene che il kernel usi la swap solo quando serve
  # davvero: scambiare pagine di Postgres per abitudine peggiora tutto.
  sysctl -w vm.swappiness=10
  echo 'vm.swappiness=10' > /etc/sysctl.d/99-flowcrm.conf
else
  echo "      swap già presente"
fi

echo "[7/7] limiti ai log del demone Docker…"
# Rete di sicurezza: i limiti per-servizio sono già nel compose, ma questo
# copre anche i container avviati a mano durante la diagnosi di un guasto,
# che è proprio il momento in cui nessuno pensa ai log.
mkdir -p /etc/docker
if [ ! -f /etc/docker/daemon.json ]; then
  cat > /etc/docker/daemon.json <<'JSON'
{
  "log-driver": "json-file",
  "log-opts": { "max-size": "10m", "max-file": "3" }
}
JSON
  systemctl restart docker
  echo "      limiti impostati"
else
  echo "      /etc/docker/daemon.json già presente — non lo tocco"
fi

# ── Verifiche finali ────────────────────────────────────────────────
echo ""
echo "=== verifica ==="
DISCO=$(df -BG --output=avail / | tail -1 | tr -dc '0-9')
RAM=$(free -g | awk '/Mem:/ {print $2}')
[ "${DISCO:-0}" -ge 40 ] && echo "  OK    disco ${DISCO} GB" \
  || echo "  nota  solo ${DISCO} GB di disco: le immagini Supabase ne occupano ~8 prima dei dati"
[ "${RAM:-0}" -ge 7 ] && echo "  OK    RAM ${RAM} GB" \
  || echo "  FAIL  ${RAM} GB di RAM: lo stack Supabase ne chiede 8 (taglio consigliato CX32)"
docker --version >/dev/null && echo "  OK    docker installato"

cat <<'FINE'

=== preparazione completata ===
Prossimi passi (RUNBOOK §4):
  git clone <repo> /opt/flowcrm && cd /opt/flowcrm && git checkout <GIT_SHA>
  cp deploy/.env.prod.example deploy/.env.prod && chmod 600 deploy/.env.prod
  ./deploy/preflight.sh
FINE

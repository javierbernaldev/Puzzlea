#!/usr/bin/env bash
# Deja listo el bucket EXISTENTE para Puzzlea sin pisar lo que ya tengas:
#   - Política: AÑADE (o actualiza) dos sentencias, PuzzleaReadImages y PuzzleaListPrefix,
#     solo para el prefijo juegos/Puzzlea/. El resto de sentencias se conservan.
#   - CORS: AÑADE la regla "PuzzleaApp" (GET/HEAD desde cualquier origen). Las demás se conservan.
#   - Block Public Access: solo lo toca si lo pides con ALLOW_PUBLIC_POLICY=1.
# Uso: ./configure-s3.sh            (necesita AWS CLI con permisos s3:GetBucketPolicy/PutBucketPolicy/GetBucketCors/PutBucketCors)
set -euo pipefail

BUCKET="fbm-622215956948-eu-west-1-an"
REGION="eu-west-1"
PREFIX="juegos/Puzzlea"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT

echo "==> 1/4 Comprobando Block Public Access"
if aws s3api get-public-access-block --bucket "$BUCKET" --region "$REGION" > "$TMP/bpa.json" 2>/dev/null; then
  BLOCKED="$(python3 -c "
import json
c=json.load(open('$TMP/bpa.json'))['PublicAccessBlockConfiguration']
print('yes' if c.get('BlockPublicPolicy') or c.get('RestrictPublicBuckets') else 'no')")"
else
  BLOCKED="no"   # sin configuración: no bloquea
fi
if [ "$BLOCKED" = "yes" ]; then
  if [ "${ALLOW_PUBLIC_POLICY:-0}" = "1" ]; then
    echo "    Permitiendo políticas públicas en el bucket (BlockPublicPolicy/RestrictPublicBuckets=false)"
    python3 -c "
import json
c=json.load(open('$TMP/bpa.json'))['PublicAccessBlockConfiguration']
c['BlockPublicPolicy']=False;c['RestrictPublicBuckets']=False
json.dump(c,open('$TMP/bpa_new.json','w'))"
    aws s3api put-public-access-block --bucket "$BUCKET" --region "$REGION" \
      --public-access-block-configuration "file://$TMP/bpa_new.json"
  else
    echo "    El bucket bloquea las políticas públicas, así que la app no podría leer las imágenes."
    echo "    Si estás de acuerdo, vuelve a ejecutar con:  ALLOW_PUBLIC_POLICY=1 $0"
    echo "    (Si el bloqueo está a nivel de CUENTA, hay que quitarlo en S3 > Block Public Access settings for this account.)"
    exit 1
  fi
fi

echo "==> 2/4 Política del bucket (fusionando con la existente)"
aws s3api get-bucket-policy --bucket "$BUCKET" --region "$REGION" --query Policy --output text \
  > "$TMP/policy_old.json" 2>/dev/null || echo '{}' > "$TMP/policy_old.json"
python3 - "$BUCKET" "$PREFIX" "$TMP/policy_old.json" "$TMP/policy_new.json" <<'PY'
import json, sys
bucket, prefix, src, dst = sys.argv[1:5]
try:
    pol = json.loads(open(src).read() or '{}')
except ValueError:
    pol = {}
pol.setdefault('Version', '2012-10-17')
sts = pol.get('Statement', [])
if isinstance(sts, dict):
    sts = [sts]
mine = ('PuzzleaReadImages', 'PuzzleaListPrefix')
sts = [s for s in sts if s.get('Sid') not in mine]
sts += [
    {"Sid": "PuzzleaReadImages", "Effect": "Allow", "Principal": "*",
     "Action": "s3:GetObject", "Resource": f"arn:aws:s3:::{bucket}/{prefix}/*"},
    {"Sid": "PuzzleaListPrefix", "Effect": "Allow", "Principal": "*",
     "Action": "s3:ListBucket", "Resource": f"arn:aws:s3:::{bucket}",
     "Condition": {"StringLike": {"s3:prefix": f"{prefix}/*"}}},
]
pol['Statement'] = sts
json.dump(pol, open(dst, 'w'), indent=2)
print(f"    {len(sts)} sentencias en la política (2 de Puzzlea)")
PY
aws s3api put-bucket-policy --bucket "$BUCKET" --region "$REGION" --policy "file://$TMP/policy_new.json"

echo "==> 3/4 CORS (fusionando con el existente)"
aws s3api get-bucket-cors --bucket "$BUCKET" --region "$REGION" > "$TMP/cors_old.json" 2>/dev/null \
  || echo '{"CORSRules":[]}' > "$TMP/cors_old.json"
python3 - "$TMP/cors_old.json" "$TMP/cors_new.json" <<'PY'
import json, sys
src, dst = sys.argv[1:3]
try:
    cors = json.loads(open(src).read() or '{}')
except ValueError:
    cors = {}
rules = [r for r in cors.get('CORSRules', []) if r.get('ID') != 'PuzzleaApp']
rules.append({"ID": "PuzzleaApp", "AllowedOrigins": ["*"], "AllowedMethods": ["GET", "HEAD"],
              "AllowedHeaders": ["*"], "MaxAgeSeconds": 3000})
json.dump({"CORSRules": rules}, open(dst, 'w'), indent=2)
print(f"    {len(rules)} reglas CORS (1 de Puzzlea)")
PY
aws s3api put-bucket-cors --bucket "$BUCKET" --region "$REGION" --cors-configuration "file://$TMP/cors_new.json"

echo "==> 4/4 Comprobando el listado público"
URL="https://$BUCKET.s3.$REGION.amazonaws.com/?list-type=2&prefix=$PREFIX/"
CODE="$(curl -s -o /dev/null -w '%{http_code}' -H 'Origin: https://localhost' "$URL" || true)"
echo "    GET listado -> HTTP $CODE (debe ser 200)"

cat <<EOF

Listo. La app lee de:
  https://$BUCKET.s3.$REGION.amazonaws.com/$PREFIX/

Subir imágenes cuadradas (necesitas s3:PutObject):
  aws s3 sync ./imagenes s3://$BUCKET/$PREFIX/
EOF

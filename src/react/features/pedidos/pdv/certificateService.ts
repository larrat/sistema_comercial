import forge from 'node-forge';
import { db, type CertificadoLocal } from './db';

// Extract the CNPJ from a certificate subject or extensions
function extractCnpjFromCert(cert: forge.pki.Certificate): string | null {
  // Typical Brazilian A1 certificates have the CNPJ in the Subject Alternative Name (SAN)
  // Or sometimes embedded in the Common Name (CN), e.g. "EMPRESA LTDA:12345678000199"
  // Let's check common locations.
  
  // 1. Try Common Name
  const cnAttr = cert.subject.getField('CN');
  if (cnAttr && typeof cnAttr.value === 'string') {
    const match = cnAttr.value.match(/:(\d{14})$/);
    if (match) return match[1];
  }

  // 2. Fallback to basic regex on CN if format differs
  if (cnAttr && typeof cnAttr.value === 'string') {
    const numbers = cnAttr.value.replace(/\D/g, '');
    if (numbers.length >= 14) {
       // Just heuristic if not standard
       return numbers.substring(numbers.length - 14);
    }
  }

  return null;
}

export async function importPfxCertificate(
  pfxBuffer: ArrayBuffer,
  password: string,
  filialId: string
): Promise<CertificadoLocal> {
  // Convert ArrayBuffer to forge byte buffer
  const p12Asb64 = forge.util.encode64(
    String.fromCharCode.apply(null, new Uint8Array(pfxBuffer) as any)
  );
  const p12Der = forge.util.decode64(p12Asb64);
  const asn1 = forge.asn1.fromDer(p12Der);
  
  // Parse PKCS#12
  const p12 = forge.pkcs12.pkcs12FromAsn1(asn1, false, password);
  
  let privateKeyForge: forge.pki.PrivateKey | null = null;
  let certForge: forge.pki.Certificate | null = null;

  // Extract key and cert
  const bags = p12.getBags({ bagType: forge.pki.oids.certBag });
  const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
  const keyBags2 = p12.getBags({ bagType: forge.pki.oids.keyBag });

  if (keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.length > 0) {
    privateKeyForge = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag][0].key as forge.pki.PrivateKey;
  } else if (keyBags2[forge.pki.oids.keyBag]?.length > 0) {
    privateKeyForge = keyBags2[forge.pki.oids.keyBag][0].key as forge.pki.PrivateKey;
  }

  if (bags[forge.pki.oids.certBag]?.length > 0) {
    certForge = bags[forge.pki.oids.certBag][0].cert as forge.pki.Certificate;
  }

  if (!privateKeyForge || !certForge) {
    throw new Error('Certificado ou chave privada não encontrados no arquivo PFX.');
  }

  // Convert Private Key to Web Crypto API CryptoKey (PKCS#8 format)
  const privateKeyPem = forge.pki.privateKeyToPem(privateKeyForge);
  const privateKeyDer = forge.util.decode64(
    privateKeyPem.replace(/-----(BEGIN|END) PRIVATE KEY-----/g, '').replace(/[\r\n]/g, '')
  );
  
  const privateKeyBuffer = new Uint8Array(privateKeyDer.length);
  for (let i = 0; i < privateKeyDer.length; i++) {
    privateKeyBuffer[i] = privateKeyDer.charCodeAt(i);
  }

  const cryptoKey = await window.crypto.subtle.importKey(
    'pkcs8',
    privateKeyBuffer,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    true, // extractable (so we can save to Dexie)
    ['sign']
  );

  // Convert Cert to PEM
  const certPem = forge.pki.certificateToPem(certForge);
  const vencimento = certForge.validity.notAfter.toISOString();
  
  const cnAttr = certForge.subject.getField('CN');
  const razaoSocial = cnAttr ? cnAttr.value : 'Empresa Desconhecida';
  const cnpj = extractCnpjFromCert(certForge) || '00000000000000';

  const certLocal: CertificadoLocal = {
    id: 'cert_padrao',
    filial_id: filialId,
    cnpj,
    razao_social: razaoSocial as string,
    vencimento,
    privateKey: cryptoKey,
    certificadoX509: certPem
  };

  // Save to Dexie
  await db.certificados.put(certLocal);

  return certLocal;
}

export async function getActiveCertificate(): Promise<CertificadoLocal | undefined> {
  return await db.certificados.get('cert_padrao');
}

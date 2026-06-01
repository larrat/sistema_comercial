import * as xmldsigjs from 'xmldsigjs';
import { getActiveCertificate } from './certificateService';

// Ensure Web Crypto API is available for xmldsigjs (browser environment fallback)
if (typeof window !== 'undefined' && window.crypto) {
  xmldsigjs.Application.setEngine('WebCrypto', window.crypto);
}

// Convert base64 PEM to Uint8Array for the certificate
function pemToUint8Array(pem: string): Uint8Array {
  const b64 = pem.replace(/-----(BEGIN|END) CERTIFICATE-----/g, '').replace(/[\r\n]/g, '');
  const binaryString = window.atob(b64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function signNfceXml(xmlString: string, uriId: string): Promise<string> {
  const certData = await getActiveCertificate();
  if (!certData) {
    throw new Error('Certificado digital não encontrado para assinatura. Por favor, importe o certificado A1 no painel.');
  }

  // Parse string into DOM Document
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, 'application/xml');

  // Verify parsing errors
  const parseError = xmlDoc.getElementsByTagName('parsererror');
  if (parseError.length > 0) {
    throw new Error('Erro ao processar o XML gerado: ' + parseError[0].textContent);
  }

  // Create Signature
  const signature = new xmldsigjs.SignedXml();
  
  // Set up Reference (the node we are signing, typical NFC-e uses id attribute on <infNFe>)
  // the MOC requires <Reference URI="#NFe...">
  const reference = new xmldsigjs.Reference();
  reference.Uri = `#${uriId}`;

  // Transforms required by SEFAZ MOC:
  // 1. Enveloped Signature
  reference.Transforms.Add(new xmldsigjs.XmlDsigEnvelopedSignatureTransform());
  // 2. C14N
  reference.Transforms.Add(new xmldsigjs.XmlDsigC14NTransform());

  // Set KeyInfo to append X509Data
  const keyInfo = new xmldsigjs.KeyInfo();
  const x509Data = new xmldsigjs.KeyInfoX509Data(pemToUint8Array(certData.certificadoX509));
  keyInfo.Add(x509Data);
  signature.XmlSignature.KeyInfo = keyInfo;

  // Compute Signature
  await signature.Sign(
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: { name: 'SHA-256' }, // The parameter expects {name: 'SHA-256'} according to WebCrypto alg
    } as any, // Cast to any because xmldsigjs typings can be weird with Algorithm
    certData.privateKey,
    xmlDoc,
    {
      keyValue: certData.privateKey,
      references: [reference as any]
    }
  );

  // SEFAZ requires the <Signature> element inside <NFe> right after <infNFe> or <infNFeSupl>
  const nfeElement = xmlDoc.getElementsByTagName('NFe')[0];
  if (!nfeElement) {
    throw new Error('Tag <NFe> não encontrada no documento para anexar a assinatura.');
  }

  nfeElement.appendChild(signature.GetXml());

  // Serialize back to string
  const serializer = new XMLSerializer();
  return serializer.serializeToString(xmlDoc);
}

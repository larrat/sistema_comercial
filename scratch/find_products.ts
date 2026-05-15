const URL = 'https://eiycrokqwhmfmjackjni.supabase.co';
const KEY = 'sb_publishable_Hc1MlzrIX9c79PEHiylpTA_9787bYHJ';

async function findIncomplete() {
  const url = `${URL}/rest/v1/produtos?or=(tamanho.is.null,genero.is.null)&produto_pai_id=not.is.null&select=id,nome,tamanho,genero,produto_pai_id`;

  const res = await fetch(url, {
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`
    }
  });

  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}

findIncomplete();

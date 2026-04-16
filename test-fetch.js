async function test() {
  const key = "key_live_1855a8a045ac48c28a65aa9cdb9d54b6";
  const secret = "secret_live_e76bf7b8333347d295204cc16f235458";

  try {
    console.log('Testing Bearer Secret...');
    const res = await fetch('https://kyc-api.surepass.io/api/v1/aadhaar-v2/generate-otp', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secret}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ id_number: '610540272367' })
    });
    const data = await res.json();
    console.log('Bearer Secret response:', JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Fetch error:', e);
  }
}
test();

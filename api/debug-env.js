// Debug endpoint to check environment variables
export default function handler(req, res) {
  const key = process.env.OPENAI_API_KEY;
  res.status(200).json({
    hasKey: !!key,
    keyLength: key ? key.length : 0,
    keyPrefix: key ? key.substring(0, 10) + '...' : null,
    keySuffix: key ? '...' + key.substring(key.length - 6) : null
  });
}

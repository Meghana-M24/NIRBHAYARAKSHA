export function getHealth(req, res) {
  res.status(200).json({
    success: true,
    data: {
      status: 'ok',
      service: 'nirbhayaraksha-backend',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
    },
  });
}
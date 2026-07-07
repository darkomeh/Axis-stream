import fs from 'fs';
const path = 'backend/api/routes.ts';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  '// POST /stream/validate',
  `// POST /stream/rank
backendRouter.post("/stream/rank", async (req, res) => {
  const { streams } = req.body;
  if (!streams || !Array.isArray(streams)) {
    res.status(400).json({ error: "Missing or invalid streams array" });
    return;
  }
  try {
    const ranked = await StreamValidator.rankStreams(streams);
    res.json({ streams: ranked });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /stream/validate`
);

fs.writeFileSync(path, code);
console.log("Patched api routes with ranking endpoint");

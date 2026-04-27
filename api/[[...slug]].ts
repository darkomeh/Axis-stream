import app from "../server";

export default function handler(req: any, res: any) {
  try {
    return app(req, res);
  } catch (err: any) {
    console.error("Express App Error:", err);
    res.status(500).json({ success: false, error: "Internal Server Error", details: err?.message || String(err) });
  }
}

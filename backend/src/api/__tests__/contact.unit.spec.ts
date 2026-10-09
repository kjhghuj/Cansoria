import { POST } from "../store/contact/route";
import { verifyTurnstileToken } from "../../lib/turnstile";
const send = jest.fn();
jest.mock("resend", () => ({
  Resend: jest.fn(() => ({ emails: { send: (...args) => send(...args) } })),
}));
jest.mock("../../lib/turnstile", () => ({ verifyTurnstileToken: jest.fn() }));
describe("studio contact delivery", () => {
  let original: NodeJS.ProcessEnv;
  beforeEach(() => {
    original = { ...process.env };
    process.env.CONTACT_EMAIL = "studio@example.com";
    process.env.RESEND_FROM_EMAIL = "Cansoria <sender@example.com>";
    process.env.RESEND_API_KEY = "test-key";
    jest.clearAllMocks();
    (verifyTurnstileToken as jest.Mock).mockResolvedValue(true);
    send.mockResolvedValue({ error: null });
  });
  afterEach(() => {
    process.env = original;
  });
  function setup() {
    return {
      req: {
        body: {
          name: "Pet Parent",
          email: "parent@example.com",
          topic: "photo",
          message: "Can you help me choose a photo?",
          turnstile_token: "test-token",
        },
      } as any,
      res: {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        setHeader: jest.fn(),
      } as any,
    };
  }
  it("rejects invalid inputs before delivery", async () => {
    const { req, res } = setup();
    req.body.email = "bad\nheader";
    await POST(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(send).not.toHaveBeenCalled();
  });
  it("requires a contact-scoped captcha", async () => {
    const { req, res } = setup();
    (verifyTurnstileToken as jest.Mock).mockResolvedValue(false);
    await POST(req, res);
    expect(verifyTurnstileToken).toHaveBeenCalledWith("test-token", "contact");
    expect(send).not.toHaveBeenCalled();
  });
  it("does not claim success when delivery is not configured or fails", async () => {
    const { req, res } = setup();
    delete process.env.CONTACT_EMAIL;
    await POST(req, res);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(send).not.toHaveBeenCalled();
    process.env.CONTACT_EMAIL = "studio@example.com";
    send.mockResolvedValue({ error: { message: "private provider error" } });
    await POST(req, res);
    expect(JSON.stringify(res.json.mock.calls)).not.toContain(
      "private provider error",
    );
  });
  it("uses a fixed studio recipient and a plain text body", async () => {
    const { req, res } = setup();
    await POST(req, res);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "studio@example.com",
        replyTo: "parent@example.com",
        text: expect.stringContaining("Can you help"),
      }),
    );
    expect(send.mock.calls[0][0]).not.toHaveProperty("html");
    expect(res.json).toHaveBeenCalledWith({
      message: "Your message has been sent to the studio.",
    });
  });
});

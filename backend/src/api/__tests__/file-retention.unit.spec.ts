jest.mock("@aws-sdk/client-s3", () => ({
  S3Client: jest.fn(() => { throw new Error("Storage access must stay disabled"); }),
  DeleteObjectCommand: jest.fn(() => { throw new Error("Physical deletion must stay disabled"); }),
  DeleteObjectsCommand: jest.fn(() => { throw new Error("Physical deletion must stay disabled"); }),
}));

import { S3Client, DeleteObjectCommand, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import middlewareConfig from "../middlewares";
import { POST as retiredFileDeletion } from "../admin/delete-file/route";
import { productImageCleanupMiddleware } from "../middlewares/product-image-cleanup";

function setup() {
  const deleteFiles = jest.fn();
  const graph = jest.fn();
  const req = {
    method: "POST",
    path: "/admin/products/prod_shared",
    params: { id: "prod_shared" },
    body: { images: [] },
    scope: { resolve: jest.fn(() => ({ deleteFiles, graph })) },
  } as any;
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as any;
  return { req, res, deleteFiles, graph };
}

describe("image edits retain shared storage assets", () => {
  beforeEach(() => { jest.clearAllMocks(); });
  afterEach(() => {
    expect(S3Client).not.toHaveBeenCalled();
    expect(DeleteObjectCommand).not.toHaveBeenCalled();
    expect(DeleteObjectsCommand).not.toHaveBeenCalled();
  });

  it("has no registered product cleanup and performs no deletion when the update fails", () => {
    const { req, res, deleteFiles, graph } = setup();
    const failure = new Error("Product validation or database update failed");
    const next = jest.fn(() => { throw failure; });
    expect(() => productImageCleanupMiddleware(req, res, next)).toThrow(failure);
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.scope.resolve).not.toHaveBeenCalled();
    expect(graph).not.toHaveBeenCalled();
    expect(deleteFiles).not.toHaveBeenCalled();
    expect(middlewareConfig.routes!.some(route => route.middlewares?.includes(productImageCleanupMiddleware))).toBe(false);
  });

  it.each([
    undefined,
    {},
    { fileKey: "shared-story.jpg" },
    { fileKey: "private/reference.png", apply: true },
    { fileKey: "../outside.txt", dryRun: false },
  ])("retires arbitrary legacy deletion inputs without resolving any dependencies: %j", async body => {
    const { req, res, deleteFiles, graph } = setup();
    req.body = body;
    await retiredFileDeletion(req, res);
    expect(res.status).toHaveBeenCalledWith(410);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ deletion_available: false, deleted_count: 0 }));
    expect(req.scope.resolve).not.toHaveBeenCalled();
    expect(graph).not.toHaveBeenCalled();
    expect(deleteFiles).not.toHaveBeenCalled();
  });

  it("does not even read deletion payloads, file IDs or query parameters", async () => {
    const { req, res } = setup();
    for (const property of ["body", "params", "query"]) {
      Object.defineProperty(req, property, { get: () => { throw new Error(`Must not read ${property}`); } });
    }
    req.scope.resolve.mockImplementation(() => { throw new Error("No service should be resolved"); });
    await retiredFileDeletion(req, res);
    expect(res.status).toHaveBeenCalledWith(410);
    expect(req.scope.resolve).not.toHaveBeenCalled();
  });

  it("blocks the installed native upload DELETE contract before its destructive handler", async () => {
    const { req, res, deleteFiles } = setup();
    req.method = "DELETE";
    req.path = "/admin/uploads/shared-story.jpg";
    req.params.id = "shared-story.jpg";
    const guard = middlewareConfig.routes!.find(route =>
      route.matcher === "/admin/uploads/:id" && route.methods?.includes("DELETE")
    );
    expect(guard).toBeDefined();
    const next = jest.fn(() => { deleteFiles(req.params.id); });
    for (const handler of guard!.middlewares!) await (handler as any)(req, res, next);
    expect(res.status).toHaveBeenCalledWith(410);
    expect(next).not.toHaveBeenCalled();
    expect(deleteFiles).not.toHaveBeenCalled();
    expect(req.scope.resolve).not.toHaveBeenCalled();
    expect(guard!.methods).toEqual(["DELETE"]);
  });
});

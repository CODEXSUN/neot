export type StorageObjectReference = {
  bucket?: string;
  key: string;
  provider: "local-filesystem" | "minio" | "s3-compatible";
};

export type PutObjectInput = {
  contentType: string;
  data: Uint8Array;
  key: string;
  tenantId?: string;
};

export type StorageAdapter = {
  getSignedReadUrl(reference: StorageObjectReference): Promise<string>;
  putObject(input: PutObjectInput): Promise<StorageObjectReference>;
};

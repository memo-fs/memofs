import {
	DeleteObjectCommand,
	GetObjectCommand,
	HeadBucketCommand,
	PutObjectCommand,
	S3Client,
	type S3ClientConfig,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type {
	ObjectStore,
	ObjectStorePutOptions,
	ObjectStoreSignedUrlOptions,
} from "../storage/object-store.js";
import { normalizeObjectKey } from "../storage/object-store.js";

export interface CreateS3ObjectStoreOptions {
	bucket: string;
	client?: S3Client;
	clientConfig?: S3ClientConfig;
	publicBaseUrl?: string;
}

export function createS3ObjectStore(
	options: CreateS3ObjectStoreOptions,
): ObjectStore {
	const client = options.client ?? new S3Client(options.clientConfig ?? {});
	const bucket = options.bucket;

	return {
		kind: "s3",
		async isReady() {
			try {
				await client.send(new HeadBucketCommand({ Bucket: bucket }));
				return true;
			} catch {
				return false;
			}
		},
		async put(
			key: string,
			body: Uint8Array,
			putOptions?: ObjectStorePutOptions,
		) {
			await client.send(
				new PutObjectCommand({
					Bucket: bucket,
					Key: normalizeObjectKey(key),
					Body: body,
					ContentType: putOptions?.contentType,
					Metadata: putOptions?.metadata,
				}),
			);
		},
		async get(key: string) {
			try {
				const response = await client.send(
					new GetObjectCommand({
						Bucket: bucket,
						Key: normalizeObjectKey(key),
					}),
				);
				if (!response.Body) return null;
				return new Uint8Array(await response.Body.transformToByteArray());
			} catch (error) {
				if (isNotFound(error)) return null;
				throw error;
			}
		},
		async delete(key: string) {
			await client.send(
				new DeleteObjectCommand({
					Bucket: bucket,
					Key: normalizeObjectKey(key),
				}),
			);
		},
		async createSignedUrl(
			key: string,
			signedUrlOptions?: ObjectStoreSignedUrlOptions,
		) {
			const normalizedKey = normalizeObjectKey(key);
			if (options.publicBaseUrl && signedUrlOptions?.method !== "PUT") {
				return `${options.publicBaseUrl.replace(/\/$/, "")}/${normalizedKey}`;
			}
			const expiresIn = signedUrlOptions?.expiresInSeconds ?? 900;
			if (signedUrlOptions?.method === "PUT") {
				return getSignedUrl(
					client,
					new PutObjectCommand({
						Bucket: bucket,
						Key: normalizedKey,
						ContentType: signedUrlOptions.contentType,
					}),
					{ expiresIn },
				);
			}
			return getSignedUrl(
				client,
				new GetObjectCommand({ Bucket: bucket, Key: normalizedKey }),
				{ expiresIn },
			);
		},
	};
}

function isNotFound(error: unknown): boolean {
	const candidate = error as {
		name?: string;
		$metadata?: { httpStatusCode?: number };
	};
	return (
		candidate.name === "NoSuchKey" ||
		candidate.$metadata?.httpStatusCode === 404
	);
}

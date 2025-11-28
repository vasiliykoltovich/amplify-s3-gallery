
import React, { useState, useEffect } from "react";
import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const REGION = process.env.REACT_APP_AWS_REGION;
const BUCKET = process.env.REACT_APP_S3_BUCKET;

const ACCESS_KEY = process.env.REACT_APP_AWS_ACCESS_KEY_ID;
const SECRET_KEY = process.env.REACT_APP_AWS_SECRET_ACCESS_KEY;

const ENV_INDICATOR = process.env.REACT_APP_ENV_INDICATOR;

const s3Client = new S3Client({
  region: REGION,
  credentials: ACCESS_KEY
    ? { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET_KEY }
    : undefined,
});

export default function App() {
  const [file, setFile] = useState(null);
  const [images, setImages] = useState([]);

  const uploadFile = async () => {
    if (!file) return;

    const key = `${Date.now()}-${file.name}`;

    try {
      const upload = new Upload({
        client: s3Client,
        params: {
          Bucket: BUCKET,
          Key: key,
          Body: file,
          ContentType: file.type,
        },
      });

      upload.on("httpUploadProgress", (p) => console.log("Upload progress:", p));

      await upload.done();
      setFile(null);

      loadImages();
    } catch (err) {
      console.error("Upload error:", err);
    }
  };

  const loadImages = async () => {
    try {
      const list = await s3Client.send(
        new ListObjectsV2Command({ Bucket: BUCKET })
      );

      const urls = await Promise.all(
        (list.Contents || []).map(async (obj) => {
          const url = await getSignedUrl(
            s3Client,
            new GetObjectCommand({
              Bucket: BUCKET,
              Key: obj.Key,
            }),
            { expiresIn: 3600 }
          );

          return { key: obj.Key, url };
        })
      );

      setImages(urls);
    } catch (err) {
      console.error("Error loading images:", err);
    }
  };

  useEffect(() => {
    loadImages();
  }, []);

  return (
    <div style={{ textAlign: "center", padding: 40 }}>
      <h1>S3 Gallery (Environment: {ENV_INDICATOR})</h1>

      <div style={{ marginBottom: 20 }}>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files[0])}
        />
        <button onClick={uploadFile} disabled={!file} style={{ marginLeft: 10 }}>
          Upload to S3 with new picture
        </button>
      </div>

      <h2>Images Gallery</h2>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 20,
          justifyContent: "center",
        }}
      >
        {images.map((img) => (
          <div
            key={img.key}
            style={{
              width: 150,
              height: 150,
              overflow: "hidden",
              borderRadius: 10,
              boxShadow: "0 0 4px rgba(0,0,0,0.3)",
            }}
          >
            <img
              src={img.url}
              alt="preview"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover"
              }}
            />
           <p>{img.key}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

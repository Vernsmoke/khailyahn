"use client";
import { useState } from "react";
import Image from "next/image";
type PhotoSubject = { id: string; name: string; photo_version?: string };

export function MemberPhoto({
  member,
  resource = "members",
}: {
  member: PhotoSubject;
  resource?: "members" | "staff";
}) {
  return (
    <div className="member-portrait">
      {member.photo_version ? (
        <Image
          unoptimized
          width={144}
          height={144}
          src={`/api/${resource}/${member.id}/photo?v=${member.photo_version}`}
          alt={`${member.name} profile`}
        />
      ) : (
        <span aria-label="No profile photo">
          {member.name
            .split(" ")
            .map((part) => part[0])
            .slice(0, 2)
            .join("")}
        </span>
      )}
    </div>
  );
}
export function PhotoField({
  member,
  resource = "members",
  initialPhoto,
}: {
  member?: PhotoSubject;
  resource?: "members" | "staff";
  initialPhoto?: string;
}) {
  const [photo, setPhoto] = useState<string | undefined>(initialPhoto);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const source =
    photo === undefined
      ? member?.photo_version
        ? `/api/${resource}/${member.id}/photo?v=${member.photo_version}`
        : ""
      : photo;
  return (
    <div className="photo-field">
      <div className="member-portrait">
        {source ? (
          <Image
            unoptimized
            width={144}
            height={144}
            src={source}
            alt="Member photo preview"
          />
        ) : (
          <span>No photo</span>
        )}
      </div>
      <div>
        <label>
          Profile picture (optional)
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={async (event) => {
              const field = event.currentTarget;
              const file = event.target.files?.[0];
              if (!file) return;
              setError("");
              if (
                !["image/jpeg", "image/png", "image/webp"].includes(
                  file.type,
                ) ||
                file.size > 1000000
              ) {
                setError("Choose a JPEG, PNG, or WebP photo under 1 MB.");
                event.target.value = "";
                return;
              }
              setBusy(true);
              field.setCustomValidity(
                "Please wait for the photo to finish loading.",
              );
              try {
                const result = await new Promise<string>((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onload = () => resolve(String(reader.result));
                  reader.onerror = reject;
                  reader.readAsDataURL(file);
                });
                setPhoto(result);
              } catch {
                setError("Could not read photo. Please try again.");
              } finally {
                field.setCustomValidity("");
                setBusy(false);
              }
            }}
          />
        </label>
        <small>JPEG, PNG or WebP · up to 1 MB</small>
        {source && (
          <button
            className="button small"
            type="button"
            onClick={() => setPhoto("")}
          >
            Remove photo
          </button>
        )}
        {busy && <p role="status">Reading photo…</p>}
        {error && (
          <p className="notice danger" role="alert">
            {error}
          </p>
        )}
        {photo !== undefined && (
          <input type="hidden" name="photo" value={photo} />
        )}
      </div>
    </div>
  );
}

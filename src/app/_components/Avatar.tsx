import Image from "next/image";

export function Avatar({
  name,
  imgSrc,
  alt,
}: {
  name: string;
  imgSrc?: string;
  alt?: string;
}) {
  return (
    <div className="flex items-center flex-col gap-2">
      <div className="avatar placeholder">
        <div className="bg-neutral w-16 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2 text-white">
          {imgSrc != null ? (
            <Image src={imgSrc} alt={alt ?? "avatar"} />
          ) : (
            <span className="text-3xl">{name?.slice(0, 2).toUpperCase()}</span>
          )}
        </div>
      </div>
      <span className="text-3xl text-center">{name}</span>
    </div>
  );
}

import { ReactElement, useState } from "react";
import styles from "./index.module.scss";
import FileDrop from "./FileDrop";
import BluryZone from "./BluryZone";
import {
  resize,
  encodeImageToBlurhash,
  generateGradient,
  loadImage,
  getImageData,
  getImgContentType,
} from "../utils";
import { Toaster, toast } from "sonner";
import { Image } from "./types";
import glur from "glur";

const previewImageWidth = 800;

export default function Index(): ReactElement {
  const [blurhash, setBlurhash] = useState<string>("");
  const [gradient, setGradient] = useState<string>("");
  const [image, setImage] = useState<Image | null>(null);
  const [glurData, setGlurData] = useState<any>("");

  const getBlurHash = async (url) => {
    const resizedUrl = (await resize(url, {
      fillStyle: "rgba(255, 255, 255, 1)",
    })) as string;
    const hash = await encodeImageToBlurhash(resizedUrl);
    setBlurhash(hash);
  };

  const getGradient = async (url) => {
    const gradientString = (await generateGradient(url)) as string;
    setGradient(gradientString);
  };

  const onFileDrop = async (e) => {
    e.stopPropagation();
    e.preventDefault();
    const file = Array.prototype.find.call(e.dataTransfer.files, (items) =>
      items.type.startsWith("image")
    );
    if (file) {
      const url = URL.createObjectURL(file);
      onFileChange(url);
      (document.getElementById("fileURLInput") as HTMLInputElement).value = "";
    }
  };

  const generateGlur = async (url, type) => {
    const resizedUrl = (await resize(url, {
      maxWidth: 32,
    })) as string;
    const img = (await loadImage(resizedUrl)) as HTMLImageElement;
    let imageData = getImageData(img);
    glur(imageData.data, img.width, img.height, img.width / 10);
    setGlurData({
      imageData,
      width: img.width,
      height: img.height,
    });
  };

  const onFileChange = async (url) => {
    const loadingToastId = toast.loading("loading image");
    const task = async (retry?: boolean) => {
      const loadUrl = retry
        ? `https://cors-image-proxy.lynanbreeze.workers.dev/${url}`
        : url;
      const img = (await loadImage(loadUrl)) as HTMLImageElement;
      const resizedUrl = (await resize(loadUrl)) as string;
      const type = await getImgContentType(resizedUrl);
      const previewUrl = (await resize(loadUrl, {
        maxWidth: previewImageWidth,
      })) as string;
      getBlurHash(loadUrl);
      getGradient(resizedUrl);
      const imgObj = {
        width: img.width,
        height: img.height,
        type,
        url: resizedUrl,
        previewUrl,
        originalUrl: /blob/.test(url) ? "" : url,
      };
      setImage(imgObj);
      generateGlur(loadUrl, type);
    };
    try {
      await task();
      toast.dismiss(loadingToastId);
    } catch (error) {
      toast.dismiss(loadingToastId);
      const errorToastId = toast(
        error.message || "error loading image, retry once now..."
      );
      await task(true);
      toast.dismiss(errorToastId);
    }
  };

  const calculateSize = (image) => {
    const baseWidth = 400;
    const baseHeight = 300;
    const ratio = image ? image.height / image.width : 0;
    if (image) {
      if (image.width >= image.height) {
        const calcHeight = baseWidth * ratio;

        return {
          width: calcHeight > baseHeight ? baseHeight / ratio : baseWidth,
          height: calcHeight > baseHeight ? baseHeight : calcHeight,
        };
      } else {
        return {
          width: baseHeight / ratio,
          height: baseHeight,
        };
      }
    }
    return {};
  };

  const sizes = calculateSize(image);

  return (
    <>
      <Toaster closeButton />
      <div
        className={styles.bg}
        onDrop={onFileDrop}
        onDragOver={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
      >
        <div className={styles.content}>
          <FileDrop onChange={onFileChange} image={image} />
          <a
            href='https://github.com/lynanBreeze'
            target='_blank'
            className={styles.github}
          ></a>
          <div className={styles.row}>
            <div>
              {image && (
                <>
                  <img
                    className={styles.originalImg}
                    src={image.previewUrl}
                    style={{
                      ...sizes,
                    }}
                  />
                </>
              )}
            </div>
            <BluryZone
              image={image}
              glurData={glurData}
              sizes={sizes}
            ></BluryZone>
          </div>
          <div className={styles.row}>
            <BluryZone
              image={image}
              blurhash={blurhash}
              sizes={sizes}
            ></BluryZone>
            <BluryZone
              image={image}
              gradient={gradient}
              sizes={sizes}
            ></BluryZone>
          </div>
        </div>
      </div>
    </>
  );
}

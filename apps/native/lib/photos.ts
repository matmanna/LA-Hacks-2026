import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

const MAX_PAGES = 3; // bill.parsePhoto accepts 1 to 3 pages
const MAX_EDGE = 2000;

export type Page = { imageDataUrl: string; page: number };

async function toDataUrl(asset: ImagePicker.ImagePickerAsset) {
  const landscape = asset.width > asset.height;
  const context = ImageManipulator.manipulate(asset.uri);
  if (Math.max(asset.width, asset.height) > MAX_EDGE) {
    context.resize(
      landscape
        ? { width: MAX_EDGE, height: null }
        : { width: null, height: MAX_EDGE },
    );
  }
  const image = await context.renderAsync();
  const saved = await image.saveAsync({
    format: SaveFormat.JPEG,
    compress: 0.85,
    base64: true,
  });
  return `data:image/jpeg;base64,${saved.base64}`;
}

async function toPages(result: ImagePicker.ImagePickerResult) {
  if (result.canceled) return null;
  const assets = result.assets.slice(0, MAX_PAGES);
  return Promise.all(
    assets.map(async (asset, index) => ({
      imageDataUrl: await toDataUrl(asset),
      page: index + 1,
    })),
  );
}

export async function takePhoto(): Promise<Page[] | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    throw new Error(
      "Camera access is off. Turn it on in Settings to take a photo.",
    );
  }
  return toPages(
    await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 1 }),
  );
}

export async function choosePhotos(): Promise<Page[] | null> {
  return toPages(
    await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: MAX_PAGES,
      quality: 1,
    }),
  );
}

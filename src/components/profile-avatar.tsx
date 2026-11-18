import { getDict } from "@/lib/i18n";
import { AvatarEditor } from "./avatar-editor";

/** Kabinetdagi bosiladigan profil rasmi — tarjimalarni serverda olib, klient muharririga beradi */
export async function ProfileAvatar(props: { name: string; avatarKey?: string | null; image?: string | null; size: number }) {
  const d = await getDict();
  return (
    <AvatarEditor
      {...props}
      labels={{
        change: d.dashboard.changePhoto,
        title: d.dashboard.cropTitle,
        hint: d.dashboard.cropHint,
        zoom: d.dashboard.zoom,
        other: d.dashboard.otherPhoto,
        save: d.common.save,
        close: d.common.close,
        badType: d.errors.uploadType,
        error: d.errors.generic,
      }}
    />
  );
}

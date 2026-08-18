import { setRequestLocale } from "next-intl/server";
import { ListingGalleryContent } from "@/components/listing/listing-gallery-content";
import { SubmissionGalleryLoader } from "@/components/listing/submission-gallery-loader";
import { GALLERY, getStayById } from "@/lib/mock/data";

export const revalidate = 60;

export default async function ListingGalleryPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const stay = getStayById(id);
  if (stay) {
    const images = stay.img ? [stay.img, ...GALLERY.filter((src) => src !== stay.img)] : GALLERY;
    return <ListingGalleryContent stay={stay} images={images} />;
  }

  return <SubmissionGalleryLoader id={id} />;
}

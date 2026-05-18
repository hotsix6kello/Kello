import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

async function run(name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

const adminContentSource = readFileSync(
  new URL("../../app/admin/bookings/beauty/AdminBeautyBookingsContent.tsx", import.meta.url),
  "utf8",
);

const bookingServerSource = readFileSync(
  new URL("../bookings/beautyBookingServer.ts", import.meta.url),
  "utf8",
);

await run("admin booking list/detail show attachment state from image metadata instead of URL fields only", () => {
  assert.match(adminContentSource, /selectedBookingHasImages/);
  assert.match(adminContentSource, /selectedBooking\.hasCurrentImage/);
  assert.match(adminContentSource, /selectedBooking\.hasStyleImage/);
  assert.match(adminContentSource, /\{!selectedBookingHasImages && \(/);
  assert.match(adminContentSource, /\{selectedBooking\.hasCurrentImage && \(/);
  assert.match(adminContentSource, /\{selectedBooking\.hasStyleImage && \(/);
});

await run("booking admin records are hydrated from beauty_booking_request_images metadata", () => {
  assert.match(
    bookingServerSource,
    /select\("request_id, image_type, storage_path, original_file_name, bucket_name"\)/,
  );
  assert.match(bookingServerSource, /hasCurrentImage: booking\.hasCurrentImage \|\| Boolean\(currentImage\?\.storage_path\)/);
  assert.match(bookingServerSource, /hasStyleImage: booking\.hasStyleImage \|\| Boolean\(styleImage\?\.storage_path\)/);
  assert.match(bookingServerSource, /currentImageName: currentImage\?\.original_file_name \?\? null/);
  assert.match(bookingServerSource, /styleImageName: styleImage\?\.original_file_name \?\? null/);
});

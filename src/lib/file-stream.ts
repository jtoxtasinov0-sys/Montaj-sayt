import "server-only";
import { createReadStream } from "node:fs";

/**
 * Diskdagi faylning [start, end] qismini javobga oqim bilan berish (video, buyurtma fayllari).
 *
 * Readable.toWeb() o'rniga: tomoshabin videoni yarim yo'lda yopsa, toWeb ichida
 * "Invalid state: Controller is already closed" uncaughtException chiqardi. Bu yerda:
 *  - mijoz sekin bo'lsa diskdan o'qish to'xtaydi (navbat 512 KB dan oshmaydi);
 *  - mijoz uzilsa fayl darhol yopiladi;
 *  - yopilgan oqimga yozishga urinish jarayonni yiqitmaydi.
 */
export function fileStream(file: string, start: number, end: number): ReadableStream<Uint8Array> {
  const node = createReadStream(file, { start, end, highWaterMark: 256 * 1024 });
  let closed = false;
  const stop = () => {
    closed = true;
    node.destroy();
  };
  return new ReadableStream<Uint8Array>(
    {
      start(controller) {
        node.on("data", (chunk) => {
          if (closed) return;
          try {
            controller.enqueue(chunk as Buffer);
            if ((controller.desiredSize ?? 0) <= 0) node.pause();
          } catch {
            stop();
          }
        });
        node.once("end", () => {
          if (closed) return;
          closed = true;
          try {
            controller.close();
          } catch {}
        });
        node.once("error", (e) => {
          if (closed) return;
          closed = true;
          try {
            controller.error(e);
          } catch {}
        });
      },
      pull() {
        if (!closed) node.resume();
      },
      cancel() {
        stop();
      },
    },
    new ByteLengthQueuingStrategy({ highWaterMark: 512 * 1024 }),
  );
}

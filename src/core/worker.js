/**
 * Module core/worker
 *
 * Exports a Web Worker for ReSpec, allowing for
 * multi-threaded processing of things.
 */

// Opportunistically preload syntax highlighter, which is used by the worker
import utils from "core/utils";
import workerScript from "deps/text!../../worker/respec-worker.js";
// Opportunistically preload syntax highlighter
const hint = {
  hint: "preload",
  href: "https://www.w3.org/Tools/respec/respec-highlight.js",
  as: "script",
};
const link = utils.createResourceHint(hint);
document.head.appendChild(link);

const workerURL = URL.createObjectURL(new Blob([workerScript], {type : 'application/javascript'}));
export const worker = new Worker(workerURL);

import React, { useState } from "react";
import { CopyToClipboard } from "react-copy-to-clipboard";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const rgbToHsl = (
  r: number,
  g: number,
  b: number
): [number, number, number] => {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0; // Initialize h with a default value
  let s: number,
    l = (max + min) / 2;

  if (max === min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return [h, s, l];
};

const hslToRgb = (
  h: number,
  s: number,
  l: number
): [number, number, number] => {
  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number): number => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
};

const adjustLightness = (
  h: number,
  s: number,
  l: number,
  factor: number
): [number, number, number] => {
  l = Math.min(1, Math.max(0, l + factor));
  return [h, s, l];
};

const rgbToHex = (r: number, g: number, b: number): string => {
  const componentToHex = (c: number): string => {
    const hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
  };
  return `#${componentToHex(r)}${componentToHex(g)}${componentToHex(b)}`;
};

const hexToRgb = (hex: string): [number, number, number] => {
  const bigint = parseInt(hex.slice(1), 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return [r, g, b];
};

const hslToHex = (h: number, s: number, l: number): string => {
  const [r, g, b] = hslToRgb(h, s, l);
  return rgbToHex(r, g, b);
};

const hexToHsl = (hex: string): [number, number, number] => {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHsl(r, g, b);
};

const ColorPaletteGenerator: React.FC = () => {
  const [baseColor, setBaseColor] = useState<string>("");
  const [baseColorFormat, setBaseColorFormat] = useState<"rgb" | "hex" | "hsl">(
    "rgb"
  );
  const [palette, setPalette] = useState<string[]>([]);
  const [paletteFormat, setPaletteFormat] = useState<"rgb" | "hex" | "hsl">(
    "rgb"
  );
  const [numberOfColors, setNumberOfColors] = useState<number>(10);

  const generatePalette = () => {
    if (baseColor) {
      let h: number, s: number, l: number;

      if (baseColorFormat === "rgb") {
        const baseRgb = baseColor.split(",").map(Number);
        [h, s, l] = rgbToHsl(baseRgb[0], baseRgb[1], baseRgb[2]);
      } else if (baseColorFormat === "hex") {
        [h, s, l] = hexToHsl(baseColor);
      } else {
        [h, s, l] = baseColor.split(",").map(Number) as [
          number,
          number,
          number
        ];
      }

      const newPalette: string[] = [];

      for (let i = 0; i < numberOfColors; i++) {
        const factor =
          (i - Math.floor(numberOfColors / 2)) * (1.0 / numberOfColors);
        const newHsl = adjustLightness(h, s, l, factor);
        let color: string;

        if (paletteFormat === "rgb") {
          const [r, g, b] = hslToRgb(newHsl[0], newHsl[1], newHsl[2]);
          color = `rgb(${r}, ${g}, ${b})`;
        } else if (paletteFormat === "hex") {
          color = hslToHex(newHsl[0], newHsl[1], newHsl[2]);
        } else {
          color = `hsl(${(newHsl[0] * 360).toFixed(0)}, ${(
            newHsl[1] * 100
          ).toFixed(0)}%, ${(newHsl[2] * 100).toFixed(0)}%)`;
        }

        newPalette.push(color);
      }

      setPalette(newPalette);
    }
  };

  const exportToJson = () => {
    if (palette.length) {
      const data = JSON.stringify(palette, null, 2);
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "palette.json";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const exportToImage = async () => {
    if (palette.length) {
      const paletteDiv = document.getElementById("palette");
      if (paletteDiv) {
        const canvas = await html2canvas(paletteDiv);
        const imgData = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.href = imgData;
        link.download = "palette.png";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
  };

  const exportToPdf = async () => {
    if (palette.length) {
      const paletteDiv = document.getElementById("palette");
      if (paletteDiv) {
        const canvas = await html2canvas(paletteDiv, {
          scale: 2, // Increase the scale for better quality
        });
        const imgData = canvas.toDataURL("image/png");

        // Determine PDF size
        const pdf = new jsPDF({
          orientation: "p",
          unit: "mm",
          format: "a4",
        });

        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

        pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
        pdf.save("palette.pdf");
      }
    }
  };

  const handleNumberOfColorsChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setNumberOfColors(Number(e.target.value));
  };

  return (
    <main className="min-w-[350px] font-medium">
      <header className="flex gap-5 justify-between p-5">
        <h1 className="text-4xl font-normal  font-pacifico ">Palettes</h1>
        <div className="md:flex gap-10 hidden ">
          <button
            onClick={exportToJson}
            className={`${
              palette.length ? "cursor-pointer group" : "cursor-not-allowed "
            }`}
            title="Export as JSON"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="30"
              height="30"
              viewBox="0 0 24 24"
              className="fill-gray-600 group-hover:fill-gray-900 transition-all"
            >
              <path d="M9 22h1v-2h-.989C8.703 19.994 6 19.827 6 16c0-1.993-.665-3.246-1.502-4C5.335 11.246 6 9.993 6 8c0-3.827 2.703-3.994 3-4h1V2H8.998C7.269 2.004 4 3.264 4 8c0 2.8-1.678 2.99-2.014 3L2 13c.082 0 2 .034 2 3 0 4.736 3.269 5.996 5 6zm13-11c-.082 0-2-.034-2-3 0-4.736-3.269-5.996-5-6h-1v2h.989c.308.006 3.011.173 3.011 4 0 1.993.665 3.246 1.502 4-.837.754-1.502 2.007-1.502 4 0 3.827-2.703 3.994-3 4h-1v2h1.002C16.731 21.996 20 20.736 20 16c0-2.8 1.678-2.99 2.014-3L22 11z"></path>
            </svg>
          </button>
          <button
            onClick={exportToImage}
            className={`${
              palette.length ? "cursor-pointer group" : "cursor-not-allowed"
            }`}
            title="Export as Image"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="30"
              height="30"
              viewBox="0 0 24 24"
              className="fill-gray-600 group-hover:fill-gray-900 transition-all"
            >
              <path d="M6 22h12a2 2 0 0 0 2-2V8l-6-6H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2zm7-18 5 5h-5V4zm-4.5 7a1.5 1.5 0 1 1-.001 3.001A1.5 1.5 0 0 1 8.5 11zm.5 5 1.597 1.363L13 13l4 6H7l2-3z"></path>
            </svg>
          </button>
          <button
            onClick={exportToPdf}
            className={`${
              palette.length ? "cursor-pointer group" : "cursor-not-allowed "
            }`}
            title="Export as PDF"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="30"
              height="30"
              viewBox="0 0 24 24"
              className="fill-gray-600 group-hover:fill-gray-900 transition-all"
            >
              <path d="M8.267 14.68c-.184 0-.308.018-.372.036v1.178c.076.018.171.023.302.023.479 0 .774-.242.774-.651 0-.366-.254-.586-.704-.586zm3.487.012c-.2 0-.33.018-.407.036v2.61c.077.018.201.018.313.018.817.006 1.349-.444 1.349-1.396.006-.83-.479-1.268-1.255-1.268z"></path>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM9.498 16.19c-.309.29-.765.42-1.296.42a2.23 2.23 0 0 1-.308-.018v1.426H7v-3.936A7.558 7.558 0 0 1 8.219 14c.557 0 .953.106 1.22.319.254.202.426.533.426.923-.001.392-.131.723-.367.948zm3.807 1.355c-.42.349-1.059.515-1.84.515-.468 0-.799-.03-1.024-.06v-3.917A7.947 7.947 0 0 1 11.66 14c.757 0 1.249.136 1.633.426.415.308.675.799.675 1.504 0 .763-.279 1.29-.663 1.615zM17 14.77h-1.532v.911H16.9v.734h-1.432v1.604h-.906V14.03H17v.74zM14 9h-1V4l5 5h-4z"></path>
            </svg>
          </button>

          {/* generate button */}
          <button
            onClick={generatePalette}
            className={` p-3 rounded w-64 text-xl transition-all ${
              baseColor?.length
                ? "cursor-pointer bg-blue-800 hover:bg-blue-700 text-white"
                : "cursor-not-allowed bg-gray-300 text-gray-600"
            }`}
          >
            Generate
          </button>
        </div>
      </header>
      {/* input field and buttons */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {/* base color */}
        <div className="w-full min-w-60 border border-gray-200 py-2 px-5">
          <label htmlFor="baseColor" className="block text-gray-500 text-sm">
            Enter Base Color
          </label>
          <input
            type="text"
            id="baseColor"
            placeholder={
              baseColorFormat === "rgb"
                ? " eg. 199, 61, 61"
                : baseColorFormat === "hex"
                ? "eg. #C73D3D"
                : "eg. 0.33, 0.68, 0.51"
            }
            value={baseColor}
            onChange={(e) => setBaseColor(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                generatePalette();
              }
            }}
            className=" p-2 py-4  w-full"
            autoFocus
          />
        </div>

        {/* base format */}
        <div className="w-full min-w-60 border border-gray-200 py-2 px-5">
          <label
            htmlFor="baseColorFormat"
            className="block text-gray-500 text-sm"
          >
            Base Color Format
          </label>
          <select
            id="baseColorFormat"
            value={baseColorFormat}
            onChange={(e) =>
              setBaseColorFormat(e.target.value as "rgb" | "hex" | "hsl")
            }
            className="p-2 rounded  w-full cursor-pointer"
          >
            <option className="" value="rgb">
              RGB
            </option>
            <option className="" value="hex">
              HEX
            </option>
            <option className="" value="hsl">
              HSL
            </option>
          </select>
        </div>
        {/* palette format */}
        <div className="w-full min-w-72 border border-gray-200 py-2 px-5">
          <label
            htmlFor="paletteColorFormat"
            className="block text-gray-500 text-sm"
          >
            Palette Color Format
          </label>
          <select
            id="paletteColorFormat"
            value={paletteFormat}
            onChange={(e) =>
              setPaletteFormat(e.target.value as "rgb" | "hex" | "hsl")
            }
            className="p-2 rounded  w-full cursor-pointer"
          >
            <option className="" value="rgb">
              RGB
            </option>
            <option className="" value="hex">
              HEX
            </option>
            <option className="" value="hsl">
              HSL
            </option>
          </select>
        </div>
        {/* number of colors in palette */}
        <div className="w-full min-w-48 border border-gray-200 py-2 px-5">
          <label
            htmlFor="numberOfColors"
            className="block text-gray-500 text-sm"
          >
            No of Colors
          </label>
          <select
            id="numberOfColors"
            value={numberOfColors}
            onChange={handleNumberOfColorsChange}
            className="p-2 rounded w-full cursor-pointer"
          >
            {Array.from({ length: 19 }, (_, i) => i + 2).map((num) => (
              <option className="" key={num} value={num}>
                {num}
              </option>
            ))}
          </select>
        </div>
      </section>
      {/* Generate btn mobile */}
      <section className="flex flex-wrap justify-end p-4 gap-10 md:hidden ">
        <button
          onClick={exportToJson}
          className={`${
            palette.length ? "cursor-pointer group" : "cursor-not-allowed "
          }`}
          title="Export as JSON"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="30"
            height="30"
            viewBox="0 0 24 24"
            className="fill-gray-600 group-hover:fill-gray-900 transition-all"
          >
            <path d="M9 22h1v-2h-.989C8.703 19.994 6 19.827 6 16c0-1.993-.665-3.246-1.502-4C5.335 11.246 6 9.993 6 8c0-3.827 2.703-3.994 3-4h1V2H8.998C7.269 2.004 4 3.264 4 8c0 2.8-1.678 2.99-2.014 3L2 13c.082 0 2 .034 2 3 0 4.736 3.269 5.996 5 6zm13-11c-.082 0-2-.034-2-3 0-4.736-3.269-5.996-5-6h-1v2h.989c.308.006 3.011.173 3.011 4 0 1.993.665 3.246 1.502 4-.837.754-1.502 2.007-1.502 4 0 3.827-2.703 3.994-3 4h-1v2h1.002C16.731 21.996 20 20.736 20 16c0-2.8 1.678-2.99 2.014-3L22 11z"></path>
          </svg>
        </button>
        <button
          onClick={exportToImage}
          className={`${
            palette.length ? "cursor-pointer group" : "cursor-not-allowed"
          }`}
          title="Export as Image"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="30"
            height="30"
            viewBox="0 0 24 24"
            className="fill-gray-600 group-hover:fill-gray-900 transition-all"
          >
            <path d="M6 22h12a2 2 0 0 0 2-2V8l-6-6H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2zm7-18 5 5h-5V4zm-4.5 7a1.5 1.5 0 1 1-.001 3.001A1.5 1.5 0 0 1 8.5 11zm.5 5 1.597 1.363L13 13l4 6H7l2-3z"></path>
          </svg>
        </button>
        <button
          onClick={exportToPdf}
          className={`${
            palette.length ? "cursor-pointer group" : "cursor-not-allowed "
          }`}
          title="Export as PDF"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="30"
            height="30"
            viewBox="0 0 24 24"
            className="fill-gray-600 group-hover:fill-gray-900 transition-all"
          >
            <path d="M8.267 14.68c-.184 0-.308.018-.372.036v1.178c.076.018.171.023.302.023.479 0 .774-.242.774-.651 0-.366-.254-.586-.704-.586zm3.487.012c-.2 0-.33.018-.407.036v2.61c.077.018.201.018.313.018.817.006 1.349-.444 1.349-1.396.006-.83-.479-1.268-1.255-1.268z"></path>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM9.498 16.19c-.309.29-.765.42-1.296.42a2.23 2.23 0 0 1-.308-.018v1.426H7v-3.936A7.558 7.558 0 0 1 8.219 14c.557 0 .953.106 1.22.319.254.202.426.533.426.923-.001.392-.131.723-.367.948zm3.807 1.355c-.42.349-1.059.515-1.84.515-.468 0-.799-.03-1.024-.06v-3.917A7.947 7.947 0 0 1 11.66 14c.757 0 1.249.136 1.633.426.415.308.675.799.675 1.504 0 .763-.279 1.29-.663 1.615zM17 14.77h-1.532v.911H16.9v.734h-1.432v1.604h-.906V14.03H17v.74zM14 9h-1V4l5 5h-4z"></path>
          </svg>
        </button>

        {/* generate button */}
        <button
          onClick={generatePalette}
          className={` p-3 rounded w-64 text-xl transition-all ${
            baseColor?.length
              ? "cursor-pointer bg-blue-800 hover:bg-blue-700 text-white"
              : "cursor-not-allowed bg-gray-300 text-gray-600"
          }`}
        >
          Generate
        </button>
      </section>
      {/* pallete */}
      <section
        id="palette"
        className="flex flex-col md:flex-row overflow-hidden"
      >
        {!palette.length && (
          <div className="h-[90vh] flex justify-center items-center w-full bg-gray-100">
            <h1 className="text-gray-300 font-semibold text-5xl text-center">
              Enter a base color and click on Generate
            </h1>
          </div>
        )}
        {palette.map((color, index) => (
          <div
            key={index}
            className="flex  flex-row items-center flex-1 relative"
          >
            <div
              className="w-full h-[10vh] md:h-[90vh]"
              style={{ backgroundColor: color }}
            ></div>

            <div className="absolute left-[50%] translate-x-[-50%]  w-max">
              <CopyToClipboard text={color}>
                <p
                  title="Copy"
                  className="text-3xl font-bold uppercase rotate-0 md:-rotate-90 text-white drop-shadow-[0px_2px_2px_rgba(0,0,0,1)] cursor-copy"
                >
                  {color}
                </p>
              </CopyToClipboard>
            </div>
          </div>
        ))}
      </section>

      <footer className=" p-5 text-right">
        <p className="text-gray-500">
          Developed by{" "}
          <a
            href="http://www.vivekkhanal.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-800 text-2xl font-pacifico"
          >
            Vivek
          </a>{" "}
        </p>
      </footer>
    </main>
  );
};

export default ColorPaletteGenerator;

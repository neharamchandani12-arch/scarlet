import { useState, useRef } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';

export function useBarcode() {
  const [scanning, setScanning] = useState(false);
  const readerRef = useRef(null);

  const scanBarcode = async (videoElement, onResult, onError) => {
    try {
      readerRef.current = new BrowserMultiFormatReader();
      setScanning(true);
      const result = await readerRef.current.decodeOnceFromVideoDevice(undefined, videoElement);
      setScanning(false);
      const barcode = result.getText();
      const data = await fetchNutrition(barcode);
      onResult(data);
    } catch (err) {
      setScanning(false);
      onError?.(err.message);
    }
  };

  const stopScanning = () => {
    readerRef.current?.reset();
    setScanning(false);
  };

  return { scanning, scanBarcode, stopScanning };
}

async function fetchNutrition(barcode) {
  const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
  const data = await res.json();
  if (data.status !== 1) throw new Error('Product not found');
  const p = data.product;
  const n = p.nutriments || {};
  return {
    name: p.product_name || 'Unknown Product',
    calories: Math.round(n['energy-kcal_100g'] || n['energy-kcal'] || 0),
    protein: Math.round(n.proteins_100g || n.proteins || 0),
    servingSize: p.serving_size || '100g',
  };
}

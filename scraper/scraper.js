const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const CARLIST_PATH = path.join(__dirname, 'carlist.txt');
const ENCAR_SEARCH_URL = 'https://api.encar.com/search/car/list/general';
const EXCHANGE_RATE_URL = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/krw.json';

const REQUEST_TIMEOUT_MS = parsePositiveInt(process.env.SCRAPER_TIMEOUT_MS) || 15000;
const PAGE_SIZE = parsePositiveInt(process.env.SCRAPER_PAGE_SIZE) || 500;
const MAX_RETRIES = parsePositiveInt(process.env.SCRAPER_MAX_RETRIES) || 3;
const PRICE_MARKUP_EUR = parsePositiveInt(process.env.SCRAPER_PRICE_MARKUP_EUR) || 400;
const FALLBACK_KRW_TO_EUR_RATE = 0.00069;
const UPSERT_CHUNK_SIZE = 250;
const DELETE_CHUNK_SIZE = 250;
const SELECT_PAGE_SIZE = 1000;

const ENCAR_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  Referer: 'https://www.encar.com/',
  Origin: 'https://www.encar.com',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
};

const http = axios.create({
  timeout: REQUEST_TIMEOUT_MS,
  headers: ENCAR_HEADERS,
});

const TARGET_MAKES = [
  { key: 'benz', canonicalName: 'Mercedes-Benz', queryManufacturer: '벤츠', aliases: ['benz', 'mercedes', 'mercedes benz', 'mercedes-benz'] },
  { key: 'bmw', canonicalName: 'BMW', queryManufacturer: 'BMW', aliases: ['bmw'] },
  { key: 'kia', canonicalName: 'Kia', queryManufacturer: '기아', aliases: ['kia'] },
  { key: 'audi', canonicalName: 'Audi', queryManufacturer: '아우디', aliases: ['audi'] },
  { key: 'jeep', canonicalName: 'Jeep', queryManufacturer: '지프', aliases: ['jeep'] },
  { key: 'mazda', canonicalName: 'Mazda', queryManufacturer: '마쯔다', aliases: ['mazda'] },
  { key: 'nissan', canonicalName: 'Nissan', queryManufacturer: '닛산', aliases: ['nissan'] },
  { key: 'peugeot', canonicalName: 'Peugeot', queryManufacturer: '푸조', aliases: ['peugeot', 'pezho'] },
  { key: 'renault-korea', canonicalName: 'Renault Korea', queryManufacturer: '르노코리아(삼성)', aliases: ['renault', 'renault samsung', 'renault-samsung', 'samsung renault'] },
  { key: 'volvo', canonicalName: 'Volvo', queryManufacturer: '볼보', aliases: ['volvo'] },
  { key: 'suzuki', canonicalName: 'Suzuki', queryManufacturer: '스즈키', aliases: ['suzuki'] },
  { key: 'tesla', canonicalName: 'Tesla', queryManufacturer: '테슬라', aliases: ['tesla'] },
  { key: 'smart', canonicalName: 'Smart', queryManufacturer: '스마트', aliases: ['smart'] },
  { key: 'porsche', canonicalName: 'Porsche', queryManufacturer: '포르쉐', aliases: ['porsche', 'porche'] },
  { key: 'lexus', canonicalName: 'Lexus', queryManufacturer: '렉서스', aliases: ['lexus', 'leuxs'] },
  { key: 'jaguar', canonicalName: 'Jaguar', queryManufacturer: '재규어', aliases: ['jaguar'] },
  { key: 'hyundai', canonicalName: 'Hyundai', queryManufacturer: '현대', aliases: ['hyundai', 'hyunday'] },
  { key: 'honda', canonicalName: 'Honda', queryManufacturer: '혼다', aliases: ['honda'] },
  { key: 'ford', canonicalName: 'Ford', queryManufacturer: '포드', aliases: ['ford'] },
  { key: 'fiat', canonicalName: 'Fiat', queryManufacturer: '피아트', aliases: ['fiat'] },
  { key: 'toyota', canonicalName: 'Toyota', queryManufacturer: '도요타', aliases: ['toyota'] },
  { key: 'byd', canonicalName: 'BYD', queryManufacturer: 'BYD', aliases: ['byd'] },
  { key: 'aston-martin', canonicalName: 'Aston Martin', queryManufacturer: '애스턴마틴', aliases: ['aston martin', 'aston-martin'] },
  { key: 'ferrari', canonicalName: 'Ferrari', queryManufacturer: '페라리', aliases: ['ferrari', 'ferraria'] },
];

const TARGETS_BY_ALIAS = new Map();
for (const target of TARGET_MAKES) {
  for (const alias of [target.key, ...target.aliases]) {
    TARGETS_BY_ALIAS.set(normalizeAlias(alias), target);
  }
}

const supabase = createClient(
  requireEnv('SUPABASE_URL'),
  requireEnv('SUPABASE_KEY')
);

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function parsePositiveInt(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function normalizeAlias(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanText(value) {
  return String(value || '').trim();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isRetriableError(error) {
  const status = error.response?.status;
  if (!status) {
    return true;
  }

  return [408, 429, 500, 502, 503, 504].includes(status);
}

function describeHttpError(error) {
  if (error.response) {
    return `HTTP ${error.response.status}`;
  }

  return error.message;
}

async function getWithRetry(url, config, label) {
  let lastError;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      return await http.get(url, config);
    } catch (error) {
      lastError = error;
      if (attempt >= MAX_RETRIES || !isRetriableError(error)) {
        break;
      }

      const delay = 500 * (2 ** (attempt - 1)) + Math.floor(Math.random() * 250);
      console.warn(`${label} failed (${describeHttpError(error)}). Retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }

  throw new Error(`${label} failed after ${MAX_RETRIES} attempts: ${describeHttpError(lastError)}`);
}

function createSearchRange(offset, limit) {
  return `|ModifiedDate|${offset}|${limit}`;
}

function createManufacturerQuery(queryManufacturer) {
  return `(And.Hidden.N._.CarType.A._.Manufacturer.${queryManufacturer}.)`;
}

function toInteger(value) {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isInteger(parsed) ? parsed : null;
}

function toFiniteNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function extractYear(item) {
  const formYear = toInteger(item.FormYear);
  if (formYear) {
    return formYear;
  }

  const rawYear = cleanText(item.Year);
  if (rawYear.length >= 4) {
    const parsed = toInteger(rawYear.slice(0, 4));
    if (parsed) {
      return parsed;
    }
  }

  return null;
}

function createStableNumericId(scope, parts) {
  const seed = `${scope}:${parts.join('|')}`;
  const hex = crypto.createHash('sha1').update(seed).digest('hex').slice(0, 15);
  return BigInt(`0x${hex}`).toString();
}

function normalizeFuel(rawFuel) {
  const source = cleanText(rawFuel);

  if (!source) {
    return { id: 99, name: 'E panjohur' };
  }

  if (source.includes('플러그인 하이브리드') && source.includes('디젤')) {
    return { id: 6, name: 'Plug-in Hibrid (Dizel)' };
  }

  if (source.includes('플러그인 하이브리드') && source.includes('가솔린')) {
    return { id: 5, name: 'Plug-in Hibrid (Benzin)' };
  }

  if (source.includes('하이브리드') && source.includes('디젤')) {
    return { id: 6, name: 'Hibrid (Dizel)' };
  }

  if (source.includes('하이브리드') && source.includes('가솔린')) {
    return { id: 5, name: 'Hibrid (Benzin)' };
  }

  if (source.includes('전기')) {
    return { id: 2, name: 'Elektrike' };
  }

  if (source.includes('LPG')) {
    return { id: 3, name: 'LPG' };
  }

  if (source.includes('디젤')) {
    return { id: 1, name: 'Dizel' };
  }

  if (source.includes('가솔린')) {
    return { id: 4, name: 'Benzin' };
  }

  if (source.includes('수소')) {
    return { id: 99, name: 'Hidrogjen' };
  }

  return { id: 99, name: source };
}

function buildImageUrls(item) {
  const urls = [];

  if (Array.isArray(item.Photos)) {
    for (const photo of item.Photos) {
      if (photo?.location) {
        urls.push(`https://ci.encar.com${photo.location}`);
      }
    }
  }

  if (!urls.length && item.Photo) {
    urls.push(`https://ci.encar.com${item.Photo}001.jpg`);
  }

  return Array.from(new Set(urls));
}

function convertKrwToEuro(originalPriceKrw, exchangeRate) {
  if (originalPriceKrw === null) {
    return null;
  }

  return Math.round((originalPriceKrw * exchangeRate) + PRICE_MARKUP_EUR);
}

function chunkArray(items, chunkSize) {
  const chunks = [];
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }
  return chunks;
}

function uniqueItems(items) {
  return Array.from(new Set(items));
}

async function loadRequestedAliases(options = {}) {
  if (Array.isArray(options.targetAliases) && options.targetAliases.length) {
    return options.targetAliases;
  }

  const envAliases = cleanText(process.env.SCRAPER_TARGETS);
  if (envAliases) {
    return envAliases.split(',').map(alias => alias.trim()).filter(Boolean);
  }

  const filePath = options.carListPath || CARLIST_PATH;
  const content = await fs.readFile(filePath, 'utf8');

  return content
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);
}

async function loadTargetManufacturers(options = {}) {
  const requestedAliases = await loadRequestedAliases(options);
  const targets = [];
  const unknownAliases = [];
  const seenKeys = new Set();

  for (const alias of requestedAliases) {
    const target = TARGETS_BY_ALIAS.get(normalizeAlias(alias));
    if (!target) {
      unknownAliases.push(alias);
      continue;
    }

    if (seenKeys.has(target.key)) {
      continue;
    }

    seenKeys.add(target.key);
    targets.push(target);
  }

  if (!targets.length) {
    throw new Error('No supported makes were resolved from carlist.txt or SCRAPER_TARGETS.');
  }

  return { requestedAliases, targets, unknownAliases };
}

async function fetchExchangeRate() {
  try {
    const response = await getWithRetry(EXCHANGE_RATE_URL, {}, 'Exchange rate request');
    const rate = toFiniteNumber(response.data?.krw?.eur);
    if (!rate || rate <= 0) {
      throw new Error('Invalid exchange rate payload');
    }

    console.log(`Live exchange rate: 1 KRW = ${rate} EUR`);
    return rate;
  } catch (error) {
    console.warn(`Falling back to static exchange rate (${FALLBACK_KRW_TO_EUR_RATE}) because ${error.message}`);
    return FALLBACK_KRW_TO_EUR_RATE;
  }
}

function normalizeListing(item, target, exchangeRate) {
  const errors = [];
  const vehicleId = toInteger(item.Id);
  const year = extractYear(item);
  const priceUnits = toInteger(item.Price);
  const mileageKm = toFiniteNumber(item.Mileage);

  if (!vehicleId) {
    errors.push('missing vehicle id');
  }

  if (!year) {
    errors.push('missing year');
  }

  if (!cleanText(item.Model)) {
    errors.push('missing model');
  }

  if (errors.length) {
    return { car: null, errors };
  }

  const modelName = cleanText(item.Model);
  const badgeName = cleanText(item.Badge);
  const manufacturerId = createStableNumericId('manufacturer', [target.canonicalName]);
  const modelId = createStableNumericId('model', [target.canonicalName, modelName]);
  const fuel = normalizeFuel(item.FuelType);
  const originalPriceKrw = priceUnits === null ? null : priceUnits * 10000;
  const imageUrls = buildImageUrls(item);

  return {
    car: {
      id: vehicleId,
      title: [target.canonicalName, modelName, badgeName].filter(Boolean).join(' '),
      year,
      manufacturer: {
        id: manufacturerId,
        name: target.canonicalName,
      },
      model: {
        id: modelId,
        name: modelName,
      },
      fuel,
      lots: [
        {
          lot: String(vehicleId),
          buy_now: convertKrwToEuro(originalPriceKrw, exchangeRate),
          created_at: null,
          odometer: {
            km: mileageKm,
            mi: mileageKm === null ? null : Math.round(mileageKm * 0.621371),
            status: { name: 'actual', id: 1 },
          },
          images: {
            normal: imageUrls.length ? [imageUrls[0]] : [],
            big: imageUrls,
          },
          details: {
            engine_volume: null,
            original_price: originalPriceKrw,
          },
          status: { name: 'sale', id: 3 },
        },
      ],
    },
    errors: [],
  };
}

async function fetchManufacturerCount(target) {
  const response = await getWithRetry(
    ENCAR_SEARCH_URL,
    {
      params: {
        count: 'true',
        q: createManufacturerQuery(target.queryManufacturer),
        sr: createSearchRange(0, 1),
      },
    },
    `${target.canonicalName} count request`
  );

  return toInteger(response.data?.Count) || 0;
}

async function fetchManufacturerCars(target, options = {}) {
  const pageSize = options.pageSize || PAGE_SIZE;
  const exchangeRate = options.exchangeRate || FALLBACK_KRW_TO_EUR_RATE;
  const maxListingsPerMake = parsePositiveInt(options.maxListingsPerMake) || null;
  const onCarsBatch = typeof options.onCarsBatch === 'function' ? options.onCarsBatch : null;
  const seenLotIds = new Set();
  const cars = [];
  const warnings = [];
  const validationSamples = [];
  const query = createManufacturerQuery(target.queryManufacturer);

  let initialCount = null;
  let finalCount = null;
  let duplicateCount = 0;
  let skippedListings = 0;
  let normalizedCount = 0;
  let pageFailures = 0;
  let offset = 0;
  let targetCount = null;

  while (true) {
    if (targetCount !== null && offset >= targetCount) {
      break;
    }

    const limit = targetCount === null
      ? pageSize
      : Math.min(pageSize, targetCount - offset);

    if (limit <= 0) {
      break;
    }

    let response;
    try {
      response = await getWithRetry(
        ENCAR_SEARCH_URL,
        {
          params: {
            count: 'true',
            q: query,
            sr: createSearchRange(offset, limit),
          },
        },
        `${target.canonicalName} listings @${offset}`
      );
    } catch (error) {
      pageFailures += 1;
      warnings.push(`Failed to fetch listings at offset ${offset}: ${error.message}`);
      break;
    }

    const data = response.data || {};
    const results = Array.isArray(data.SearchResults) ? data.SearchResults : [];

    if (initialCount === null) {
      initialCount = toInteger(data.Count) || results.length;
      targetCount = maxListingsPerMake === null
        ? initialCount
        : Math.min(initialCount, maxListingsPerMake);
      console.log(`[${target.canonicalName}] Found ${initialCount} listings${maxListingsPerMake ? `, limiting to ${targetCount}` : ''}.`);
    }

    if (!results.length) {
      break;
    }

    const batchCars = [];
    const uniqueCountBeforePage = seenLotIds.size;

    for (const item of results) {
      const lotId = cleanText(item.Id);
      if (!lotId) {
        skippedListings += 1;
        if (validationSamples.length < 5) {
          validationSamples.push('listing without Id');
        }
        continue;
      }

      if (seenLotIds.has(lotId)) {
        duplicateCount += 1;
        continue;
      }

      seenLotIds.add(lotId);

      const { car, errors } = normalizeListing(item, target, exchangeRate);
      if (!car) {
        skippedListings += 1;
        if (validationSamples.length < 5) {
          validationSamples.push(`${lotId}: ${errors.join(', ')}`);
        }
        continue;
      }

      batchCars.push(car);

      if (targetCount !== null && seenLotIds.size >= targetCount) {
        break;
      }
    }

    if (onCarsBatch && batchCars.length) {
      await onCarsBatch(batchCars);
    } else {
      cars.push(...batchCars);
    }

    normalizedCount += batchCars.length;

    const newUniqueListings = seenLotIds.size - uniqueCountBeforePage;
    if (newUniqueListings === 0) {
      warnings.push(
        `Encar repeated an already-seen page at offset ${offset}. `
        + 'This API appears to stop paginating reliably after roughly 10k results for a single query.'
      );
      break;
    }

    offset += results.length;

    if (results.length < limit) {
      break;
    }
  }

  if (maxListingsPerMake === null) {
    try {
      finalCount = await fetchManufacturerCount(target);
    } catch (error) {
      warnings.push(`Failed to re-check count: ${error.message}`);
      finalCount = initialCount || seenLotIds.size;
    }
  } else {
    finalCount = targetCount || seenLotIds.size;
  }

  if (validationSamples.length) {
    warnings.push(`Validation samples: ${validationSamples.join(' | ')}`);
  }

  if (finalCount > seenLotIds.size) {
    warnings.push(`Fetched ${seenLotIds.size} unique listings, but Encar reported ${finalCount} total listings for this make.`);
  }

  const fetchSucceeded = pageFailures === 0;
  const deletionSafe = maxListingsPerMake === null
    && fetchSucceeded
    && duplicateCount === 0
    && seenLotIds.size >= (finalCount || 0);

  return {
    cars,
    meta: {
      key: target.key,
      canonicalName: target.canonicalName,
      queryManufacturer: target.queryManufacturer,
      initialCount: initialCount || 0,
      finalCount: finalCount || 0,
      fetchedListings: seenLotIds.size,
      normalizedCars: normalizedCount,
      skippedListings,
      duplicateCount,
      fetchSucceeded,
      deletionSafe,
      seenLotIds: Array.from(seenLotIds),
      warnings,
    },
  };
}

function createFetchOptions(options = {}) {
  return {
    carListPath: options.carListPath,
    targetAliases: options.targetAliases,
    pageSize: options.pageSize || PAGE_SIZE,
    maxListingsPerMake: parsePositiveInt(options.maxListingsPerMake)
      || parsePositiveInt(process.env.SCRAPER_MAX_LISTINGS_PER_MAKE)
      || null,
  };
}

async function fetchCars(options = {}) {
  const fetchOptions = createFetchOptions(options);
  const startedAt = new Date().toISOString();
  const { targets, unknownAliases } = await loadTargetManufacturers(fetchOptions);
  const exchangeRate = await fetchExchangeRate();
  const cars = [];
  const makes = [];

  if (unknownAliases.length) {
    console.warn(`Ignoring unsupported makes from carlist.txt: ${unknownAliases.join(', ')}`);
  }

  for (const target of targets) {
    const result = await fetchManufacturerCars(target, {
      pageSize: fetchOptions.pageSize,
      maxListingsPerMake: fetchOptions.maxListingsPerMake,
      exchangeRate,
    });
    makes.push(result.meta);
    cars.push(...result.cars);
  }

  if (!makes.some(make => make.fetchSucceeded)) {
    throw new Error('All make fetches failed. Aborting sync.');
  }

  return {
    cars,
    sync: {
      startedAt,
      completedAt: new Date().toISOString(),
      exchangeRate,
      pageSize: fetchOptions.pageSize,
      maxListingsPerMake: fetchOptions.maxListingsPerMake,
      unknownAliases,
      makes,
    },
  };
}

async function executeSupabase(query, label) {
  const { data, error } = await query;
  if (error) {
    throw new Error(`${label}: ${error.message}`);
  }

  return data;
}

async function upsertRows(table, rows, options = {}) {
  if (!rows.length) {
    return 0;
  }

  let written = 0;
  for (const chunk of chunkArray(rows, UPSERT_CHUNK_SIZE)) {
    await executeSupabase(
      supabase.from(table).upsert(chunk, options.supabaseOptions || {}),
      `Upsert ${table}`
    );
    written += chunk.length;
  }

  return written;
}

async function insertRows(table, rows) {
  if (!rows.length) {
    return 0;
  }

  let written = 0;
  for (const chunk of chunkArray(rows, UPSERT_CHUNK_SIZE)) {
    await executeSupabase(
      supabase.from(table).insert(chunk),
      `Insert ${table}`
    );
    written += chunk.length;
  }

  return written;
}

async function deleteRowsByColumnValues(table, column, values, label) {
  if (!values.length) {
    return 0;
  }

  let deleted = 0;
  for (const chunk of chunkArray(values, DELETE_CHUNK_SIZE)) {
    await executeSupabase(
      supabase.from(table).delete().in(column, chunk),
      `${label} (${table})`
    );
    deleted += chunk.length;
  }

  return deleted;
}

async function fetchAllRows(table, columns, applyFilters = query => query) {
  const rows = [];
  let offset = 0;

  while (true) {
    const query = applyFilters(
      supabase
        .from(table)
        .select(columns)
        .range(offset, offset + SELECT_PAGE_SIZE - 1)
    );

    const data = await executeSupabase(query, `Select ${table}`);
    if (!data.length) {
      break;
    }

    rows.push(...data);

    if (data.length < SELECT_PAGE_SIZE) {
      break;
    }

    offset += SELECT_PAGE_SIZE;
  }

  return rows;
}

function buildPersistencePayload(cars) {
  const manufacturers = new Map();
  const models = new Map();
  const fuels = new Map();
  const vehicles = new Map();
  const lots = new Map();
  const allLotIds = new Set();
  const imagesByLot = new Map();

  for (const car of cars) {
    manufacturers.set(String(car.manufacturer.id), {
      id: car.manufacturer.id,
      name: car.manufacturer.name,
    });

    models.set(String(car.model.id), {
      id: car.model.id,
      name: car.model.name,
      manufacturer_id: car.manufacturer.id,
    });

    fuels.set(String(car.fuel.id), {
      id: car.fuel.id,
      name: car.fuel.name,
    });

    vehicles.set(String(car.id), {
      id: car.id,
      title: car.title,
      year: car.year,
      manufacturer_id: car.manufacturer.id,
      model_id: car.model.id,
      fuel_id: car.fuel.id,
    });

    for (const lot of car.lots || []) {
      const lotId = String(lot.lot);
      allLotIds.add(lotId);

      lots.set(lotId, {
        lot_id: lotId,
        vehicle_id: car.id,
        buy_now: lot.buy_now,
        lot_created_at: lot.created_at,
        odometer_km: lot.odometer?.km,
        odometer_mi: lot.odometer?.mi,
        odometer_status: lot.odometer?.status?.name,
        engine_volume: lot.details?.engine_volume,
        original_price: lot.details?.original_price,
        status: lot.status?.name === 'sale' ? 'On Sale' : lot.status?.name,
      });

      const seenImages = new Set();
      const lotImages = [];
      for (const url of lot.images?.normal || []) {
        const key = `normal:${url}`;
        if (!seenImages.has(key)) {
          seenImages.add(key);
          lotImages.push({ lot_id: lotId, url, type: 'normal' });
        }
      }

      for (const url of lot.images?.big || []) {
        const key = `big:${url}`;
        if (!seenImages.has(key)) {
          seenImages.add(key);
          lotImages.push({ lot_id: lotId, url, type: 'big' });
        }
      }

      imagesByLot.set(lotId, lotImages);
    }
  }

  return {
    manufacturers: Array.from(manufacturers.values()),
    models: Array.from(models.values()),
    fuels: Array.from(fuels.values()),
    vehicles: Array.from(vehicles.values()),
    lots: Array.from(lots.values()),
    allLotIds: Array.from(allLotIds),
    imagesByLot,
  };
}

async function refreshLotImages(allLotIds, imagesByLot) {
  let refreshedImages = 0;

  for (const lotIdChunk of chunkArray(allLotIds, DELETE_CHUNK_SIZE)) {
    await executeSupabase(
      supabase.from('lot_images').delete().in('lot_id', lotIdChunk),
      'Delete lot images before refresh'
    );

    const imageRows = [];
    for (const lotId of lotIdChunk) {
      imageRows.push(...(imagesByLot.get(lotId) || []));
    }

    refreshedImages += await insertRows('lot_images', imageRows);
  }

  return refreshedImages;
}

async function upsertCarsToSupabase(cars) {
  if (!cars.length) {
    return {
      manufacturers: 0,
      models: 0,
      fuels: 0,
      vehicles: 0,
      lots: 0,
      images: 0,
    };
  }

  const payload = buildPersistencePayload(cars);

  const summary = {
    manufacturers: await upsertRows('manufacturers', payload.manufacturers),
    models: await upsertRows('models', payload.models),
    fuels: await upsertRows('fuels', payload.fuels),
    vehicles: await upsertRows('vehicles', payload.vehicles),
    lots: await upsertRows('lots', payload.lots),
    images: await refreshLotImages(payload.allLotIds, payload.imagesByLot),
  };

  return summary;
}

async function fetchLotsForVehicleIds(vehicleIds) {
  const rows = [];

  for (const vehicleIdChunk of chunkArray(vehicleIds, DELETE_CHUNK_SIZE)) {
    rows.push(...await fetchAllRows(
      'lots',
      'lot_id, vehicle_id',
      query => query.in('vehicle_id', vehicleIdChunk)
    ));
  }

  return rows;
}

async function deleteMissingListings(makeScopes) {
  const summary = {
    lots: 0,
    images: 0,
    vehicles: 0,
    makesProcessed: 0,
    makesSkipped: 0,
  };

  for (const scope of makeScopes) {
    if (!scope.deletionSafe) {
      summary.makesSkipped += 1;
      const reason = scope.warnings.length ? scope.warnings.join(' | ') : 'scope was not fully fetched';
      console.warn(`[${scope.canonicalName}] Skipping deletion safeguard: ${reason}`);
      continue;
    }

    const manufacturers = await fetchAllRows(
      'manufacturers',
      'id, name',
      query => query.eq('name', scope.canonicalName)
    );

    const manufacturerIds = manufacturers.map(row => row.id);
    if (!manufacturerIds.length) {
      summary.makesProcessed += 1;
      continue;
    }

    const vehicles = await fetchAllRows(
      'vehicles',
      'id, manufacturer_id',
      query => query.in('manufacturer_id', manufacturerIds)
    );

    const vehicleIds = uniqueItems(vehicles.map(row => row.id));
    if (!vehicleIds.length) {
      summary.makesProcessed += 1;
      continue;
    }

    const lots = await fetchLotsForVehicleIds(vehicleIds);
    const seenLotIds = new Set(scope.seenLotIds.map(String));
    const missingLots = lots.filter(lot => !seenLotIds.has(String(lot.lot_id)));
    const missingLotIds = uniqueItems(missingLots.map(lot => String(lot.lot_id)));

    if (!missingLotIds.length) {
      summary.makesProcessed += 1;
      continue;
    }

    summary.images += await deleteRowsByColumnValues('lot_images', 'lot_id', missingLotIds, 'Delete disappeared lot images');
    summary.lots += await deleteRowsByColumnValues('lots', 'lot_id', missingLotIds, 'Delete disappeared lots');

    const affectedVehicleIds = uniqueItems(missingLots.map(lot => lot.vehicle_id));
    const remainingLots = await fetchLotsForVehicleIds(affectedVehicleIds);
    const vehiclesWithLots = new Set(remainingLots.map(lot => String(lot.vehicle_id)));
    const orphanVehicleIds = affectedVehicleIds.filter(vehicleId => !vehiclesWithLots.has(String(vehicleId)));

    summary.vehicles += await deleteRowsByColumnValues('vehicles', 'id', orphanVehicleIds, 'Delete orphan vehicles');
    summary.makesProcessed += 1;

    console.log(`[${scope.canonicalName}] Removed ${missingLotIds.length} disappeared listings.`);
  }

  return summary;
}

function normalizeSaveInput(input) {
  if (Array.isArray(input)) {
    return { cars: input, sync: null };
  }

  return {
    cars: Array.isArray(input?.cars) ? input.cars : [],
    sync: input?.sync || null,
  };
}

async function saveToSupabase(input, options = {}) {
  const { cars, sync } = normalizeSaveInput(input);
  console.log(`Starting data ingestion to Supabase for ${cars.length} cars...`);

  const writeSummary = await upsertCarsToSupabase(cars);
  let deleteSummary = null;

  if (options.deleteMissing !== false && sync?.makes?.length) {
    deleteSummary = await deleteMissingListings(sync.makes);
  }

  const summary = {
    ...writeSummary,
    deletion: deleteSummary,
  };

  console.log('Ingestion completed.', summary);
  return summary;
}

async function syncCars(options = {}) {
  const fetchOptions = createFetchOptions(options);
  const startedAt = new Date().toISOString();
  const { targets, unknownAliases } = await loadTargetManufacturers(fetchOptions);
  const exchangeRate = await fetchExchangeRate();
  const summary = {
    startedAt,
    completedAt: null,
    exchangeRate,
    pageSize: fetchOptions.pageSize,
    maxListingsPerMake: fetchOptions.maxListingsPerMake,
    unknownAliases,
    makes: [],
    totals: {
      fetchedListings: 0,
      normalizedCars: 0,
      skippedListings: 0,
      savedVehicles: 0,
      savedLots: 0,
      refreshedImages: 0,
      deletedLots: 0,
      deletedImages: 0,
      deletedVehicles: 0,
    },
  };

  if (unknownAliases.length) {
    console.warn(`Ignoring unsupported makes from carlist.txt: ${unknownAliases.join(', ')}`);
  }

  for (const target of targets) {
    const perMakeWriteSummary = {
      vehicles: 0,
      lots: 0,
      images: 0,
    };

    const result = await fetchManufacturerCars(target, {
      pageSize: fetchOptions.pageSize,
      maxListingsPerMake: fetchOptions.maxListingsPerMake,
      exchangeRate,
      onCarsBatch: async batchCars => {
        const writeSummary = await upsertCarsToSupabase(batchCars);
        perMakeWriteSummary.vehicles += writeSummary.vehicles;
        perMakeWriteSummary.lots += writeSummary.lots;
        perMakeWriteSummary.images += writeSummary.images;
      },
    });

    summary.makes.push(result.meta);
    summary.totals.fetchedListings += result.meta.fetchedListings;
    summary.totals.normalizedCars += result.meta.normalizedCars;
    summary.totals.skippedListings += result.meta.skippedListings;
    summary.totals.savedVehicles += perMakeWriteSummary.vehicles;
    summary.totals.savedLots += perMakeWriteSummary.lots;
    summary.totals.refreshedImages += perMakeWriteSummary.images;

    if (perMakeWriteSummary.vehicles > 0) {
      console.log(`[${target.canonicalName}] Saved ${perMakeWriteSummary.vehicles} vehicles and ${perMakeWriteSummary.lots} lots.`);
    } else {
      console.log(`[${target.canonicalName}] No valid listings to save.`);
    }
  }

  if (!summary.makes.some(make => make.fetchSucceeded)) {
    throw new Error('All make fetches failed. No deletion was attempted.');
  }

  if (fetchOptions.maxListingsPerMake === null) {
    const deleteSummary = await deleteMissingListings(summary.makes);
    summary.totals.deletedLots = deleteSummary.lots;
    summary.totals.deletedImages = deleteSummary.images;
    summary.totals.deletedVehicles = deleteSummary.vehicles;
    summary.deletion = deleteSummary;
  } else {
    summary.deletion = {
      skipped: true,
      reason: 'Deletion is disabled when SCRAPER_MAX_LISTINGS_PER_MAKE is set.',
    };
  }

  summary.completedAt = new Date().toISOString();
  return summary;
}

if (require.main === module) {
  const cliAliases = process.argv.slice(2);

  syncCars({ targetAliases: cliAliases.length ? cliAliases : undefined })
    .then(summary => {
      console.log('Encar scraper sync finished.');
      console.log(JSON.stringify({
        totals: summary.totals,
        makes: summary.makes.map(make => ({
          make: make.canonicalName,
          fetchedListings: make.fetchedListings,
          normalizedCars: make.normalizedCars,
          skippedListings: make.skippedListings,
          deletionSafe: make.deletionSafe,
        })),
      }, null, 2));
    })
    .catch(error => {
      console.error('Encar scraper sync failed:', error.message);
      process.exitCode = 1;
    });
}

module.exports = {
  fetchCars,
  saveToSupabase,
  syncCars,
  loadTargetManufacturers,
};

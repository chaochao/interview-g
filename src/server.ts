// server.ts
import express, { Request, Response } from 'express';
import businesses from './businesses.json';

const app = express();
app.use(express.json());

interface Business {
  name: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
}

interface LocationFilter {
  state?: string;
  lat?: number;
  lng?: number;
}

interface SearchRequest {
  locations: LocationFilter[];
  radiusMiles?: number;
  text?: string;
}

// Calculate distance between two points in miles
// NOTE: get the function form google
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Search businesses by location and text

// Note: For many DB system, there are geo index, for example 
// PostGIS extension for PostgreSQL: https://postgis.net/workshops/postgis-intro/indexing.html, or 
// MongoDb: https://www.mongodb.com/docs/manual/core/indexes/index-types/index-geospatial/
// the whole search by location should be replaced by database geo search result.
function searchBusinesses(locations: LocationFilter[], radiusMiles: number, text?: string): Business[] {
  const results: Business[] = [];
  
  for (const business of businesses as Business[]) {
    let matchesLocation = false;
    
    // Check each location filter
    for (const location of locations) {
      if (location.state && business.state === location.state) {
        matchesLocation = true;
        break;
      }
      
      if (location.lat !== undefined && location.lng !== undefined) {
        const distance = calculateDistance(
          location.lat, location.lng,
          business.latitude, business.longitude
        );
        if (distance <= radiusMiles) {
          matchesLocation = true;
          break;
        }
      }
    }
    
    // Check text filter
    let matchesText = true;
    if (text) {
      // Note: there we can do Regex or fuzzy matching with misspelling, still find relevant result
      // for example, text is tacobell or tacabell can find taco bell
      matchesText = business.name.toLowerCase().includes(text.toLowerCase());
    }
    
    if (matchesLocation && matchesText) {
      results.push(business);
    }
  }
  // NOTE: we should do a sorting according to the distance
  return results;
}

// POST /businesses/search endpoint
app.post('/businesses/search', (req: Request, res: Response) => {
  try {
    if(!req.body) {
      return res.status(400).json({ error: 'POST body is required' });
    }
    const { locations, radiusMiles = 10, text }: SearchRequest = req.body;
    if (!locations || !Array.isArray(locations) || locations.length === 0) {
      return res.status(400).json({ error: 'locations array is required' });
    }
    
    // Radius expansion sequence. 
    const expansionRadius = [radiusMiles, 1, 5, 10, 25, 50, 100, 500];
    const uniqueRadius = [...new Set(expansionRadius)].sort((a, b) => a - b);
    
    let results: Business[] = [];
    let finalRadius = radiusMiles;
    let expanded = false;
    let explain =''
    // Try each radius until we find results
    for (const testRadius of uniqueRadius) {
      results = searchBusinesses(locations, testRadius, text);
      finalRadius = testRadius;
      
      if (results.length > 0) {
        if (testRadius > radiusMiles) {
          expanded = true;
          // Note: not necessary, but easier to give UI a uniform output.
          explain = `there's no result within ${radiusMiles} miles, expand to ${testRadius} miles.`
        }
        break;
      }
    }
    // NOTE: no result even for the max distance
    if (finalRadius === uniqueRadius[uniqueRadius.length-1] && results.length === 0) {
      expanded = true;
      explain = `there's no result within ${finalRadius} miles`

    }
    const response = {
      businesses: results,
      totalResults: results.length,
      businessesWithin: finalRadius,
      searchParameters: {
        locations,
        radiusMiles: radiusMiles,
        text: text || undefined
      }
    };
    
    // Add radius expansion info if expanded
    if (expanded) {
      (response as any).radiusExpanded = {
        originalRadius: radiusMiles,
        finalRadius: finalRadius,
        explain,
        expanded: true
      };
    }
    
    res.json(response);
    
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 8001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Search endpoint: POST http://localhost:${PORT}/businesses/search`);
});

export default app;
## Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Server starts on http://localhost:8001
```

## Include brief notes or comments if you made tradeoffs or assumptions
I write the server in node.js and Express

## how you would productionize your submission:
1. **Geo Search**: Replace the in-memory geo search with database geo-indexing for scalability and efficient queries.  
2. **Word Search**: Use fuzzy matching to handle typos, variations, and improve search relevance.  
3. **Pagination**: Implement pagination to manage large datasets and avoid performance issues.  
4. **Sorting**: Return results sorted by distance by default for a better user experience.  
5. **Multi-Parameter Search**: Support filtering and sorting by multiple parameters (e.g., popularity, rating) for richer search capabilities.  

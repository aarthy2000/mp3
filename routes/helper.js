class QueryGenerator{

    constructor(query, queryParams){
        this.query = query;
        this.parseQueryParameters(queryParams);
    }
    addQuery(query){
        this.query = query;
    }

    parseQueryParameters(queryParams){

        const where = queryParams.where ? JSON.parse(queryParams.where) : {};
        const select = queryParams.select ? JSON.parse(queryParams.select) : null;
        const sort = queryParams.sort ? JSON.parse(queryParams.sort) : null;
        const skip = queryParams.skip ? parseInt(queryParams.skip) : null;
        const limit = queryParams.limit ? parseInt(queryParams.limit) : 100;
        const count = queryParams.count ? queryParams.count : null;

        if (where) this.query = this.query.where(where)
        if (select) this.query = this.query.select(select);
        if (sort) this.query = this.query.sort(sort);
        if (skip) this.query = this.query.skip(skip);
        if (limit) this.query = this.query.limit(limit);
        if (count) this.query = this.query.count(count);

        console.log("count",queryParams.count);

        this.advancedQuery = this.query;
    }
}

module.exports = QueryGenerator;
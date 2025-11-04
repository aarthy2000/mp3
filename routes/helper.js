class QueryGenerator{

    constructor(query, queryParams, type){
        this.query = query;
        this.parseQueryParameters(queryParams, type);
    }
    addQuery(query){
        this.query = query;
    }

    parseQueryParameters(queryParams, type){

        const defaultLimit = type==="tasks" ? 100 : null;

        let baseQuery = this.query;

        try{
        
        const where = queryParams.where ? JSON.parse(queryParams.where) : {};
        const select = queryParams.select ? JSON.parse(queryParams.select) : null;
        const sort = queryParams.sort ? JSON.parse(queryParams.sort) : null;
        const skip = queryParams.skip ? parseInt(queryParams.skip) : null;
        const limit = queryParams.limit ? parseInt(queryParams.limit) : defaultLimit;
        const count = queryParams.count ? queryParams.count : null;

        if (where) this.query = this.query.where(where)
        if (select) this.query = this.query.select(select);
        if (sort) this.query = this.query.sort(sort);
        if (skip) this.query = this.query.skip(skip);
        if (limit) this.query = this.query.limit(limit);
        if (count) this.query = this.query.countDocuments();

        }
        catch(e){
            this.advancedQuery = baseQuery;
        }

        this.advancedQuery = this.query;
    }
}

module.exports = QueryGenerator;
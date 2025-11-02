module.exports = function (router) {

    router.get('/',function (req, res) {
        // console.log('home',req);
        var connectionString = process.env.TOKEN;
        res.json({ message: 'My connection string is ' + connectionString });
    });

    return router;
}

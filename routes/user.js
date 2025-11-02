var User = require('../models/user')
var Task = require('../models/task')
const QueryGenerator = require('./helper');


module.exports = function (router) {

  const userRoute = router.route('/users');
  const userRoute_pv = router.route('/users/:id'); //path-variable
  
  userRoute.get(async (req, res) => {
    const baseQuery = User.find({})
    const queryGenerator = new QueryGenerator(baseQuery, req.query);
    const users = await queryGenerator.advancedQuery.exec();
    var json = {
      'message': 'OK',
      "data": users
    }
    res.status(200).send(json);
  });

 

  userRoute.post(async (req, res) =>{
    const body = req.body;

    try{
      const userObject = new User(body);
      const newUser = await userObject.save();
      res.status(201).send({
        'message':'CREATED',
        'data': newUser
      })
    }
    catch(e){
      res.status(500).send({
        'message': 'INTERNAL SERVER ERROR',
        'data':{'error': `User could not be inserted: Encountered error: ${e}`}
      })
    }

  })

   userRoute_pv.get(async (req, res) => {
    const userId = req.params.id;
    const queryGenerator = new QueryGenerator(User.findById({_id: userId}), req.query);
    const user = await queryGenerator.advancedQuery.exec();

    if (user === null){
      var json = {
      'message': 'NOT FOUND',
    }
    res.status(404).send(json);
    }
    else{
      var json = {
      'message': 'OK',
      "data": user
    }
    res.status(200).send(json);
    }
    
  });

  userRoute_pv.delete(async (req, res) => {
        const userId = req.params.id;
        const user = await User.findById({_id: userId});
        var pendingTasks = user.pendingTasks;
    
        if (user === null){
          var json = {
            'message': 'NOT FOUND',
            'data':{'error':`user with id ${userId} not found`}
          }
          res.status(404).send(json);
        }
        else{
          try{
            var deleteuser = await User.deleteOne({_id:userId});

            pendingTasks.forEach(async element => {
              var task = await Task.findOneAndUpdate(
                {_id: element},
                {$set:{
                  assignedUser: "",
                  assignedUserName: ""
                }}
              )
            });
            
            
            res.status(204).send();
          }
          catch(e){
            var json = {
                'message': 'INTERNAL SERVER ERROR',
                'data': {'error':`Error encountered while attempting to delete: ${e}`}
            }
              res.status(500).send(json);
          }
          
        }
        
      });
  
      userRoute_pv.put(async (req, res) => {
        const userId = req.params.id;
        const userBody = req.body;
        const user = await User.findById({_id: userId});

        userBody.pendingTasks = user.pendingTasks;
    
        if (user === null){
          var json = {
            'message': 'NOT FOUND',
            'data':{'error':`User with id ${userId} not found`}
          }
          res.status(404).send(json);
        }
        else{
          try{

            var putuser = await User.replaceOne(
              {_id:userId},
              userBody, //we replace the entire body with what user provided, only retaining pendingTasks
              {runValidators: true, new: true}
            );

            if(user.name !== putuser.name){
              //update tasks assignedUserName for pendingTasks only
              putuser.pendingTasks.forEach(async task => {
                await Task.findByIdAndUpdate(
                  {_id: task},
                  {$set: {assignedUserName: putuser.name}}
                )
              })
            }
          
            var json = {
                'message': 'OK',
                'data': putuser
            }
            res.status(200).send(json);
          }
          catch(e){
            var json = {
                'message': 'INTERNAL SERVER ERROR',
                'data':{'error':`Error encountered while attempting to replace: ${e}`}
            }
              res.status(500).send(json);
          }
          
        }
        
      });

  return router;
};

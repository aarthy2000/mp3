var User = require('../models/user')
var Task = require('../models/task')
const QueryGenerator = require('./helper');


module.exports = function (router) {

  const userRoute = router.route('/users');
  const userRoute_pv = router.route('/users/:id'); //path-variable
  
  userRoute.get(async (req, res) => {
    const baseQuery = User.find({})
    try{
    const queryGenerator = new QueryGenerator(baseQuery, req.query,"users");
    const users = await queryGenerator.advancedQuery.exec();
    var json = {
      'message': 'OK',
      "data": users
    }
    res.status(200).send(json);
    }
    catch(e){
      var json = {
      'message': 'BAD REQUEST',
      "data": {"error":`Error while fetching users: ${e}`}
    }
      res.status(400).send(json);
    }
  });

 

  userRoute.post(async (req, res) =>{
    const body = req.body;

    try{
      const userObject = new User(body);

      const pendingTasks = body.pendingTasks ? body.pendingTasks : [];
      console.log("pending takss? ",pendingTasks);
      for(item of pendingTasks){
        var task = await Task.findOne(
          {_id: item},
          {assignedUser:1}
        )
        //if task does not exist, throw error
        if(task === null){
          throw new Error(`Task with id ${item} does not exist!`);
        }
        //task and user has 1:1 relationship
        if(task.assignedUser !== ""){
          throw new Error(`Pending task ${item} is already assigned to a different user!`)
        }

        if(task.completed){
          throw new Error(`Task with id ${taskId} is completed and immutable`)
        }

        task.assignedUser = userObject._id;
        task.assignedUserName = userObject.name;
        console.log("body: ",task);
        await task.save();
      }

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

    try{
    const queryGenerator = new QueryGenerator(User.findById({_id: userId}), req.query,"users");
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
    }
    catch(e){
      res.status(500).send({
        'message': 'INTERNAL SERVER ERROR',
        'data':{'error': `User could not be inserted: Encountered error: ${e}`}
      })
    }
    
  });

  userRoute_pv.delete(async (req, res) => {
        const userId = req.params.id;
        const user = await User.findById({_id: userId});
        
    
        if (user === null){
          var json = {
            'message': 'NOT FOUND',
            'data':{'error':`user with id ${userId} not found`}
          }
          res.status(404).send(json);
        }
        else{
          try{
            var pendingTasks = user.pendingTasks;
            var deleteuser = await User.deleteOne({_id:userId});

            for(element of pendingTasks){
              var task = await Task.findOneAndUpdate(
                {_id: element},
                {$set:{
                  assignedUser: "",
                  assignedUserName: "unassigned"
                }}
              )
            };
            
            
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

        if (user === null){
          var json = {
            'message': 'NOT FOUND',
            'data':{'error':`User with id ${userId} not found`}
          }
          res.status(404).send(json);
        }
        else{
          try{
            const requestedPendingTasks = userBody.pendingTasks ? userBody.pendingTasks : [];

            //unassigned pending tasks that are not in the request list
            for(item of user.pendingTasks){
              var task = await Task.findOneAndUpdate(
                item,
                {$set:{
                  assignedUser: "",
                  assignedUserName:"unassigned"
                }}
              )
            }
            //assign requested pending tasks to this user
            for(item of requestedPendingTasks){
              var task = await Task.findOne(
                {_id: item},
                {assignedUser:1}
              )
            
            if(task === null){
              throw new Error(`Task ${item} does not exist!`)
            }
            //task and user has 1:1 relationship
            if(task.assignedUser !== "" && task.assignedUser !== user._id){
              throw new Error(`Pending task ${item} is already assigned to a different user!`)
            }

             if(task.completed){
                throw new Error(`Task with id ${taskId} is completed and immutable`)
            }

            task.assignedUser = user._id;
            task.assignedUserName = user.name;
            await task.save();
            };

            userBody.pendingTasks = requestedPendingTasks;
            var putuser = await User.findOneAndReplace(
              {_id:userId},
              userBody, //we replace the entire body with what user provided, only retaining pendingTasks
              {runValidators: true, new: true}
            );

            if(user.name !== putuser.name){
              //update tasks assignedUserName for pendingTasks only
              for (task of putuser.pendingTasks){
                await Task.findByIdAndUpdate(
                  {_id: task},
                  {$set: {assignedUserName: putuser.name, assignedUser: userId}}
                )
              }
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

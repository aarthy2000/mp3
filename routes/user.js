var User = require('../models/user')
var Task = require('../models/task')
const QueryGenerator = require('./helper');

let error_codes = {
  400: "BAD REQUEST",
  500: "INTERNAL SERVER ERROR"
}
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

    //delete objects that should be auto-created by database
    delete body._id
    delete body.dateCreated;

    try{
      const userObject = new User(body);

      let pendingTasks = body.pendingTasks ? body.pendingTasks : [];

      pendingTasks = new Set(pendingTasks)
      pendingTasks = [...pendingTasks]

      for(item of pendingTasks){
        var task = await Task.findOne(
          {_id: item},
          {assignedUser:1, completed:1}
        )
        //if task does not exist, throw error
        if(task === null){  
          throw new Error(`Task with id ${item} does not exist!`);
        }
        //completed tasks can not be changed
        if(task.completed){
          throw new Error(`Task with id ${item} is completed and immutable`)
        }
        //changing according to post 312 in piazza
        if(!isEmpty(task.assignedUser)){
         //unassign from old user
         var oldUser = await User.findByIdAndUpdate(
          {_id: task.assignedUser},
          {$pull:{pendingTasks:item}}
         );
        }
        
        //assign this user's id and username
        task.assignedUser = userObject._id;
        task.assignedUserName = userObject.name;

        await task.save();
      }

      const newUser = await userObject.save();
      res.status(201).send({
        'message':'CREATED',
        'data': newUser
      })
    }
    catch(e){
      
      let email_error = e.toString().includes("duplicate key error collection") && e.toString().includes("email_1");

      let error_message = email_error ? "Email address must be unique to a user" : e;
      let status = email_error ? 400 : 500;
      res.status(status).send({
        'message': 'INTERNAL SERVER ERROR',
        'data':{'error': `User could not be inserted: Encountered error: ${error_message}`}
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
      let {error, code} = classifyError(e);
      res.status(code).send({
        'message': error_codes[code],
        'data':{'error': `User could not be inserted: Encountered error: ${error}`}
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
            let {error, code} = classifyError(e);
            var json = {
                'message': error_codes[code],
                'data': {'error':`Error encountered while attempting to delete: ${error}`}
            }
              res.status(500).send(json);
          }
          
        }
        
      });

      userRoute_pv.put(async (req, res) => {
        const userId = req.params.id;
        const userBody = req.body;

        delete userBody._id
        delete userBody.dateCreated;

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
            let requestedPendingTasks = userBody.pendingTasks ? userBody.pendingTasks : [];

            //remove duplicates when its present in user req body

            requestedPendingTasks = new Set(requestedPendingTasks)
            requestedPendingTasks = [...requestedPendingTasks]

            const existingPendingTasks = user.pendingTasks;

            //assign requested pending tasks to this user
            for(item of requestedPendingTasks){
              var task = await Task.findOne(
                {_id: item},
                {assignedUser:1, completed:1}
              )
            
            if(task === null){
              throw new Error(`Task ${item} does not exist!`)
            }
            if(task.completed){
              throw new Error(`Task with id ${task._id} is completed and immutable `);
            }
            //changing according to post 312 in piazza
            if(!isEmpty(task.assignedUser)){
              //unassign from old user
              var oldUser = await User.findByIdAndUpdate(
              {_id: task.assignedUser},
              {$pull:{pendingTasks:item}}
            );
            }

            task.assignedUser = user._id;
            task.assignedUserName = user.name;
            await task.save();
            }
          

            for(item of existingPendingTasks){
              if(!requestedPendingTasks.includes(item)){
                await Task.findByIdAndUpdate(
                  {_id: item},
                  {$set:{
                    assignedUser: "",
                    assignedUserName: "unassigned"
                  }}
                )
              }
            }
            

            userBody.pendingTasks = requestedPendingTasks;
            var putuser = await User.findByIdAndUpdate(
              userId,
              userBody, //we replace the entire body with what user provided, only retaining pendingTasks
              {runValidators: true, new: true}
            );

            if(user.name !== putuser.name){
              //update tasks assignedUserName for pendingTasks only
              for (task of putuser.pendingTasks){
                await Task.findByIdAndUpdate(
                  task,
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
            let {error, code} = classifyError(e);
            
            var json = {
                'message': error_codes[code],
                'data':{'error':`Error encountered while attempting to replace: ${error}`}
              }
              res.status(code).send(json);
          }
          
        }
        
      });

  return router;
};

function classifyError(error){
  let error_response = {
    "error": error,
    "code": 500
  }
  if(error.toString().includes("CastError: Cast to ObjectId failed for value")){
    error_response = {
    "error": "String is provided where ObjectId is expected",
    "code": 400
    }
    
  }

  else if(error.toString().includes("Email must be unique")){
    error_response = {
    "error": "Email must be unique to a user",
    "code": 400
    }
  }
  return error_response;
}


function isEmpty(value){
  return value===null || value===undefined || value.trim()==='';
}
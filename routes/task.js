var Task = require('../models/task')
var User = require('../models/user');
const QueryGenerator = require('./helper');

module.exports = function (router) {

  const taskRoute = router.route('/tasks');
  const taskRoute_pv = router.route('/tasks/:id');


  taskRoute.get(async (req, res) => {
    
    const baseQuery = Task.find({});
    try{
      const queryGenerator = new QueryGenerator(baseQuery, req.query,"tasks");
      const tasks = await queryGenerator.advancedQuery.exec();

      var json = {
        'message': 'OK',
        "data": tasks
      }
      res.status(200).send(json);
      }
      catch(e){
        sendErrorResponse(res,400,e,"attempting to fetch tasks");
      }

    });

   taskRoute.post(async (req, res) =>{
      const requestTaskBody = req.body;

      try{
        const taskBody = new Task(requestTaskBody);
        const hasAssignedUser = !isEmpty(requestTaskBody.assignedUser);

        taskBody.assignedUserName = "unassigned";
        taskBody.assignedUser = "";

        if(hasAssignedUser){
          const assignedUserObject = await User.findOne({_id: requestTaskBody.assignedUser}) ?? (() => { throw new Error(`We haven't heard of that User: ${requestTaskBody.assignedUser}`) })();

          //assignedUserName must be extrapolated if it does not exist in the request body
          console.log(requestTaskBody.assignedUserName, assignedUserObject.name);
          if(isEmpty(requestTaskBody.assignedUserName)){
            console.log("empty?");
            taskBody.assignedUserName = assignedUserObject.name;
          }
          else if(requestTaskBody.assignedUserName !== assignedUserObject.name){
            throw new Error(`User with id ${assignedUserObject._id} has a different name`)
          }
          taskBody.assignedUser = assignedUserObject._id;
        }
        

        const newTask = await taskBody.save();
        //script request body has completed as a string, hence Im considering that case as well.
        const isCompleted = String(requestTaskBody.completed).toLowerCase() === 'true' ? true: false;

        if(hasAssignedUser && !isCompleted){
          const user = await User .findOneAndUpdate(
          {_id: requestTaskBody.assignedUser},
          {$addToSet:{pendingTasks: newTask._id}});
        }

          res.status(201).send({
            'message':'CREATED',
            'data': newTask
           })
        }
      catch(e){
        sendErrorResponse(res,500,e,"inserting task");
      }
  
    })
  
     taskRoute_pv.get(async (req, res) => {
      const taskId = req.params.id;
      const queryGenerator = new QueryGenerator(Task.findById({_id: taskId}), req.query, "tasks");
      const task = await queryGenerator.advancedQuery.exec();
  
      if (task === null){
        sendErrorResponse(res,404, `Task with ${taskId} not found`,"attempting to fetch task");
      }
      else{
        var json = {
        'message': 'OK',
        "data": task
      }
      res.status(200).send(json);
      }
      
    });

    taskRoute_pv.delete(async (req, res) => {
      const taskId = req.params.id;
      const task = await Task.findById({_id: taskId});

      if (task === null){
        sendErrorResponse(res,404,`Task with id ${taskId} not found`,"attempting to delete task");
      }
      else{
        try{
          var deleteTask = await Task.deleteOne({_id:taskId});
          if(!isEmpty(task.assignedUser)){
            var user = await User.findByIdAndUpdate(
            {_id: task.assignedUser},
            {$pull: {pendingTasks: taskId}}
          );
          }

          res.status(204).send();
        }
        catch(e){
          sendErrorResponse(res,500,e,"attempting to delete task"); 
        }
        
      }
      
    });

    taskRoute_pv.put(async (req, res) => {
      const taskId = req.params.id;
      const requestTaskBody = req.body;
      const fetchedTask = await Task.findById({_id: taskId});
  
      if (fetchedTask === null){
        sendErrorResponse(res,404,`Task with id ${taskId} not found`,"attempting to edit task");
      }
      else{
        if(fetchedTask.completed){
          return sendErrorResponse(res,500,`Task with id ${taskId} is completed and immutable`,'attempting to edit task')
        }
        try{
        //add assignedUserName and assignedUser ID to body
        var hasAssignedUser = !isEmpty(requestTaskBody.assignedUser);
        if(hasAssignedUser){
          const assignedUserObject = await User.findOne({_id: requestTaskBody.assignedUser}) ?? (() => { throw new Error(`We haven't heard of that User: ${requestTaskBody.assignedUser}`) })();

          //assignedUserName must be extrapolated if it does not exist in the request body
          if(!isEmpty(requestTaskBody.assignedUserName)){
            requestTaskBody.assignedUserName = assignedUserObject.name;
          }
          else if(requestTaskBody.assignedUserName !== assignedUserObject.name){
            throw new Error(`User with id ${assignedUserObject._id} has a different name`)
          }
          requestTaskBody.assignedUser = assignedUserObject._id;
          
        }
        //unassigning only if the assignedUser == "", to prevent accident unassociations when assignedUser is not present in request Body
        else if(requestTaskBody.assignedUser === ""){
          requestTaskBody.assignedUser = "";
          requestTaskBody.assignedUserName = "unassigned"
        }
        //if completed, remove from pending tasks
        const isCompleted = String(requestTaskBody.completed).toLowerCase() === 'true' ? true: false;
        if(isCompleted){
          var user = await User.findByIdAndUpdate(
            {_id: fetchedTask.assignedUser},
            {$pull: {pendingTasks: taskId}}
          );
        }
        requestTaskBody.name = requestTaskBody.name ? requestTaskBody.name : fetchedTask.name;
        requestTaskBody.deadline = requestTaskBody.deadline ? requestTaskBody.deadline : fetchedTask.deadline;

        var putTask = await Task.findOneAndReplace(
          {_id: taskId},
          requestTaskBody,
          {runValidators: true, new: true});
       
        if(hasAssignedUser){

          //pull from old user
          if(requestTaskBody.assignedUser.toString() !== fetchedTask.assignedUser.toString()){

          const user = await User.findOneAndUpdate(
        {_id: fetchedTask.assignedUser},
        {$pull:{pendingTasks: taskId}});
        }

          //push to new user if not completed
          if(!isCompleted){

        const user = await User.findOneAndUpdate(
        {_id: requestTaskBody.assignedUser},
        {$addToSet:{pendingTasks: taskId}});
        }
        }
          

        var json = {
            'message': 'OK',
            'data': putTask
        }
        res.status(200).send(json);
        }
        catch(e){
          sendErrorResponse(res,400,e,"attempting to replace task");
        }
        
      }
      
    });

  return router;
};

function isEmpty(value){
  return value===null || value===undefined || value.trim()==='';
}


function sendErrorResponse(res, status, error, request_type){
  let message_codes = {
    404: "NOT FOUND",
    500: "INTERNAL SERVER ERROR",
    400: "BAD REQUEST",
  }
  var json = {
              'message': message_codes[status],
              'data':{'error':`Error encountered while attempting to ${request_type}: ${error}`}
          }
  res.status(500).send(json);
}
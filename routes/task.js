var Task = require('../models/task')
var User = require('../models/user');
const QueryGenerator = require('./helper');

module.exports = function (router) {

  const taskRoute = router.route('/tasks');
  const taskRoute_pv = router.route('/tasks/:id');


  taskRoute.get(async (req, res) => {
    
    const baseQuery = Task.find({});
    const queryGenerator = new QueryGenerator(baseQuery, req.query,"tasks");
    const tasks = await queryGenerator.advancedQuery.exec();

    var json = {
      'message': 'OK',
      "data": tasks
    }
    res.status(200).send(json);
  });

   taskRoute.post(async (req, res) =>{
      const body = req.body;

      try{
        const taskBody = new Task(body);
        const hasAssignedUser = !isEmpty(body.assignedUser);

        taskBody.assignedUserName = "unassigned";
        taskBody.assignedUser = "";

        if(hasAssignedUser){
          const assignedUserObject = await User.findOne({_id: body.assignedUser}) ?? (() => { throw new Error(`We haven't heard of that User: ${body.assignedUser}`) })();

          taskBody.assignedUserName = assignedUserObject.name;
          taskBody.assignedUser = body.assignedUser;
        }
        

        const newTask = await taskBody.save();
        const isCompleted = String(body.completed).toLowerCase() === 'true' ? true: false;

        if(hasAssignedUser && !isCompleted){
          const user = await User .findOneAndUpdate(
          {_id: body.assignedUser},
          {$addToSet:{pendingTasks: newTask._id}});
        }

          res.status(201).send({
            'message':'CREATED',
            'data': newTask
           })
        }
      catch(e){
        res.status(500).send({
          'message':'INTERNAL SERVER ERROR',
          'data':{'error':`Task could not be inserted: Encountered error: ${e}`}
        })
      }
  
    })
  
     taskRoute_pv.get(async (req, res) => {
      const taskId = req.params.id;
      const queryGenerator = new QueryGenerator(Task.findById({_id: taskId}), req.query, "tasks");
      const task = await queryGenerator.advancedQuery.exec();
  
      if (task === null){
        var json = {
          'message': 'NOT FOUND',
        }
        res.status(404).send(json);
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
        var json = {
          'message': 'NOT FOUND',
          'data':{'error':`Task with id ${taskId} not found`}
        }
        res.status(404).send(json);
      }
      else{
        try{
          var deleteTask = await Task.deleteOne({_id:taskId});
          var user = await User.findByIdAndUpdate(
            {_id: task.assignedUser},
            {$pull: {pendingTasks: taskId}}
          );

          res.status(204).send();
        }
        catch(e){
          var json = {
              'message': 'INTERNAL SERVER ERROR',
              'data':{'error':`Error encountered while attempting to delete: ${e}`}
          }
            res.status(500).send(json);
        }
        
      }
      
    });

    taskRoute_pv.put(async (req, res) => {
      const taskId = req.params.id;
      const requestTaskBody = req.body;
      const fetchedTask = await Task.findById({_id: taskId});
  
      if (fetchedTask === null){
        var json = {
          'message': 'NOT FOUND',
          'data':{'error':`Task with id ${taskId} not found`}
        }
        res.status(404).send(json);
      }
      else{
        try{
        //add assignedUserName and assignedUser ID to body
        var hasAssignedUser = !isEmpty(requestTaskBody.assignedUser);
        if(hasAssignedUser){
          const assignedUserObject = await User.findOne({_id: requestTaskBody.assignedUser}) ?? (() => { throw new Error(`We haven't heard of that User: ${requestTaskBody.assignedUser}`) })();
          requestTaskBody.assignedUser = assignedUserObject._id;
          requestTaskBody.assignedUserName = assignedUserObject.name;
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

function isEmpty(value){
  return value===null || value===undefined || value.trim()==='';
}

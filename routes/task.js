var Task = require('../models/task')
var User = require('../models/user');
const QueryGenerator = require('./helper');

module.exports = function (router) {

  const taskRoute = router.route('/tasks');
  const taskRoute_pv = router.route('/tasks/:id');


  taskRoute.get(async (req, res) => {
    
    const baseQuery = Task.find({});
    const queryGenerator = new QueryGenerator(baseQuery, req.query);
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
        if(hasAssignedUser){
          const assignedUserObject = await User.findOne({_id: body.assignedUser}) ?? (() => { throw new Error(`We haven't heard of that User: ${body.assignedUser}`) })();

          taskBody.assignedUserName = assignedUserObject.name;
        }

        const newTask = await taskBody.save();

        if(hasAssignedUser){
          const user = await User .findOneAndUpdate(
          {_id: body.assignedUser},
          {$push:{pendingTasks: body._id}});
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
      const queryGenerator = new QueryGenerator(Task.findById({_id: taskId}), req.query);
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
      const taskBody = req.body;
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
        //add assignedUserName and assignedUser ID to body
        var hasAssignedUser = !isEmpty(taskBody.assignedUser);
        if(hasAssignedUser){
          const assignedUserObject = await User.findOne({_id: taskBody.assignedUser}) ?? (() => { throw new Error(`We haven't heard of that User: ${taskBody.assignedUser}`) })();

          taskBody.assignedUserName = assignedUserObject.name;
        }
        //if completed, remove from pending tasks
        if(body.completed){
          var user = await User.findByIdAndUpdate(
            {_id: task.assignedUser},
            {$pull: {pendingTasks: taskId}}
          );
        }

          var putTask = await Task.replaceOne(
            taskId,
            taskBody,
            {runValidators: true, new: true});
          
          if(hasAssignedUser){
            const user = await User.findOneAndUpdate(
          {_id: taskBody.assignedUser},
          {$push:{pendingTasks: taskBody._id}});
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
  var boo = value===null || value===undefined || value.trim()==='';
  console.log("isEmpty? ",boo);
  return boo;
}

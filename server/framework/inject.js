module.exports=function(provided){
    return function(dependencyName, optional){
        if(!provided[dependencyName] && !optional){
            throw new Error("Required dependency <" + dependencyName + "> is not provided.")
        }
        return provided[dependencyName];
    }
};
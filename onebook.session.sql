SELECT t.*,(SELECT count(*) from conversations c where t.id=c.taskID) as messages, (SELECT count(*) from attachments a where t.id=a.taskID) as attachments FROM tasks t;
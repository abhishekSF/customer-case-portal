const LIST_SOQL =
  "SELECT Id, CaseNumber, Status, LastModifiedDate, Owner.Name, Subject, Description FROM Case ORDER BY LastModifiedDate DESC LIMIT 20";

#!/usr/bin/env python
# -*- coding: utf-8 -*-

import time;
from girder.models.model_base import Model
from girder.constants import AccessType
from girder.exceptions import ValidationException

# Create new db and interactions api/db
class Execution(Model):
    def initialize(self):
        self.name = 'vip_execution'
        self.ensureIndices(('name', 'fileId', 'userId', 'pipelineName',
            'vipExecutionId','childFolderResult',
            'status', 'sendMail', 'timestampCreation', 'timestampFin'))

    def validate(self, Execution):
        return Execution

    def get(self):
        for execution in self.find():
            yield execution

    def createExecution(self, params, user):
        if len(params['fileId']) == 0:
            raise ValidationException("Parameter fileId should not be empty")

        execution = {
            'name': params['name'],
            'fileId': params['fileId'],
            'userId': user['_id'],
            'pipelineName': params['pipelineName'],
            'vipExecutionId': params['vipExecutionId'],
            'idFolderResult': params['idFolderResult'],
            'status': params['status'],
            'sendMail': params['sendMail'],
            'timestampCreation': time.time(),
            'timestampFin': params['timestampFin']
        }

        # Save in the db
        return self.save(execution)

    def setStatus(self, execution, status):
        execution['status'] = status
        self.save(execution)

    def remove(self, doc):
        super(Execution, self).remove(doc)

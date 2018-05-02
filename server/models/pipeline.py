#!/usr/bin/env python
# -*- coding: utf-8 -*-

import time;
from girder.models.model_base import Model
from girder.constants import AccessType
from girder.exceptions import ValidationException

class PipelineExecution(Model):
    def initialize(self):
        self.name = 'pipeline_execution'
        self.ensureIndices(('name', 'fileId', 'userId', 'vipExecutionId', 'pathResultGirder',
        'status', 'sendMail', 'listFileResult', 'timestampCreation', 'timestampFin'))

        '''
        self.ensureTextIndex({
        'name': 10,
        })

        self.exposeFields(level=AccessType.READ, fields={
        '_id', 'name'
        })
        '''

    def validate(self, PipelineExecution):
        return PipelineExecution

    def get(self):
        for pipeline in self.find():
            yield pipeline

    def createProcess(self, params, user):
        if len(params['fileId']) == 0:
            raise ValidationException("Parameter fileId should not be empty")

        pipeline = {
            'name': params['name'],
            'fileId': params['fileId'],
            'userId': user['_id'],
            'vipExecutionId': params['vipExecutionId'],
            'pathResultGirder': params['pathResultGirder'],
            'status': params['status'],
            'sendMail': params['sendMail'],
            'listFileResult': params['listFileResult'],
            'timestampCreation': time.time(),
            'timestampFin': params['timestampFin']
        }

        return self.save(pipeline)

    def remove(self, doc):
        super(PipelineExecution, self).remove(doc)

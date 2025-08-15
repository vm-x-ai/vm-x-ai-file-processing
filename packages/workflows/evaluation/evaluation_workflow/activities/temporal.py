from workflow_shared_actitivies.activity_meta import TemporalActivityMeta

from evaluation_workflow.activities.get_files_to_evaluate import (
    GetFilesToEvaluateActivity,
)
from evaluation_workflow.activities.start_evaluations import StartEvaluationsActivity
from evaluation_workflow.activities.store_evaluation import StoreEvaluationActivity


class GetFilesToEvaluateActivityTemporal(
    GetFilesToEvaluateActivity, metaclass=TemporalActivityMeta
): ...


class StartEvaluationsActivityTemporal(
    StartEvaluationsActivity, metaclass=TemporalActivityMeta
): ...


class StoreEvaluationActivityTemporal(
    StoreEvaluationActivity, metaclass=TemporalActivityMeta
): ...

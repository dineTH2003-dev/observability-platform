const db = require("../config/db");
const logger = require("../config/logger");
const notificationService = require("./notification.service");

class AlertEvaluatorService {
  async evaluateAlertRules() {
    try {
      // Fetch active rules
      const { rows: rules } = await db.query(`SELECT * FROM alerts WHERE enabled = TRUE`);
      
      for (const rule of rules) {
        try {
          await this.evaluateRule(rule);
        } catch (err) {
          logger.error({ msg: `Error evaluating rule ${rule.id}`, err: err.message });
        }
      }
    } catch (err) {
      logger.error({ msg: "Failed to fetch alert rules for evaluation", err: err.message });
    }
  }

  async evaluateRule(rule) {
    const { id, condition, duration, threshold, cooldown, send_once } = rule;
    const durationMins = parseInt(duration) || 0;
    const cooldownMins = parseInt(cooldown) || 0;
    const thresholdVal = parseFloat(threshold) || 1;

    let triggeredEntities = [];

    switch (condition) {
      case 'system_health_critical': {
        // Must be critical (cpu > 90 OR mem > 90 OR disk > 90) for all data points in duration
        const { rows } = await db.query(`
          SELECT server_id AS entity_id, 'server' AS entity_type
          FROM server_metrics
          WHERE recorded_at >= NOW() - ($1 || ' minutes')::INTERVAL
          GROUP BY server_id
          HAVING 
            SUM(CASE WHEN cpu_usage > 90 OR memory_usage > 90 OR disk_usage > 90 THEN 1 ELSE 0 END) = COUNT(*)
            AND COUNT(*) > 0
        `, [durationMins]);
        triggeredEntities = rows;
        break;
      }
      case 'system_health_degraded': {
        const { rows } = await db.query(`
          SELECT server_id AS entity_id, 'server' AS entity_type
          FROM server_metrics
          WHERE recorded_at >= NOW() - ($1 || ' minutes')::INTERVAL
          GROUP BY server_id
          HAVING 
            SUM(CASE WHEN cpu_usage > 70 OR memory_usage > 70 OR disk_usage > 80 THEN 1 ELSE 0 END) = COUNT(*)
            AND COUNT(*) > 0
        `, [durationMins]);
        triggeredEntities = rows;
        break;
      }
      case 'error_rate_high': {
        const { rows } = await db.query(`
          SELECT service_id AS entity_id, 'service' AS entity_type
          FROM logs
          WHERE level = 'error' 
            AND timestamp >= NOW() - ($1 || ' minutes')::INTERVAL
          GROUP BY service_id
          HAVING COUNT(*) >= $2
        `, [durationMins, thresholdVal]);
        triggeredEntities = rows;
        break;
      }
      case 'anomaly_critical': {
        const { rows } = await db.query(`
          SELECT anomaly_id::text AS entity_id, 'anomaly' AS entity_type
          FROM anomalies
          WHERE severity = 'critical'
            AND status != 'resolved'
            AND detected_at <= NOW() - ($1 || ' minutes')::INTERVAL
        `, [durationMins]);
        triggeredEntities = rows;
        break;
      }
      case 'anomaly_high_severity': {
        const { rows } = await db.query(`
          SELECT anomaly_id::text AS entity_id, 'anomaly' AS entity_type
          FROM anomalies
          WHERE severity = 'high'
            AND status != 'resolved'
            AND detected_at <= NOW() - ($1 || ' minutes')::INTERVAL
        `, [durationMins]);
        triggeredEntities = rows;
        break;
      }
      case 'service_unavailable': {
        const { rows } = await db.query(`
          SELECT service_id AS entity_id, 'service' AS entity_type
          FROM services
          WHERE status IN ('STOPPED', 'ERROR')
            AND updated_at <= NOW() - ($1 || ' minutes')::INTERVAL
        `, [durationMins]);
        triggeredEntities = rows;
        break;
      }
      case 'agent_disconnected': {
        const { rows } = await db.query(`
          SELECT server_id AS entity_id, 'server' AS entity_type
          FROM servers
          WHERE agent_status = 'INACTIVE'
            AND updated_at <= NOW() - ($1 || ' minutes')::INTERVAL
        `, [durationMins]);
        triggeredEntities = rows;
        break;
      }
      case 'latency_high':
        // Latency not currently supported by metrics
        break;
      default:
        logger.warn({ msg: `Unknown alert condition: ${condition}` });
        break;
    }

    if (!triggeredEntities || triggeredEntities.length === 0) return;

    for (const entity of triggeredEntities) {
      const { entity_id, entity_type } = entity;
      
      // Check cooldown and send_once
      const { rows: evalRows } = await db.query(`
        SELECT last_triggered_at 
        FROM alert_rule_evaluations 
        WHERE rule_id = $1 AND entity_type = $2 AND entity_id = $3
      `, [id, entity_type, entity_id]);

      const lastTrigger = evalRows[0]?.last_triggered_at;
      
      if (lastTrigger) {
        if (send_once) {
          continue; // Already sent once
        }
        
        const minutesSinceLast = (Date.now() - new Date(lastTrigger).getTime()) / (1000 * 60);
        if (minutesSinceLast < cooldownMins) {
          continue; // Still in cooldown
        }
      }

      // Record evaluation
      await db.query(`
        INSERT INTO alert_rule_evaluations (rule_id, entity_type, entity_id, last_triggered_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (rule_id, entity_type, entity_id) 
        DO UPDATE SET last_triggered_at = NOW()
      `, [id, entity_type, entity_id]);

      // Trigger Notification
      await notificationService.notifyCustomAlertRule(rule, { entity_type, entity_id });
    }
  }
}

module.exports = new AlertEvaluatorService();

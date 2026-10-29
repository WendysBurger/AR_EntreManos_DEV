import * as ecs from '@8thwall/ecs'

// One click closes one panel and opens another. Attach to the navigation button.
ecs.registerComponent({
  name: 'Panel Switch Button',

  schema: {
    // @label Enabled
    enabled: ecs.boolean,
    // @label Panel To Activate
    panelToActivate: ecs.eid,
    // @label Panel To Deactivate
    panelToDeactivate: ecs.eid,
  },

  schemaDefaults: {
    enabled: true,
  },

  stateMachine: ({world, eid, schemaAttribute}) => {
    const taps = new Set<number>()
    const maxTapMovement = 0.025

    const belongsTo = (entity: bigint, ancestor: bigint) => {
      for (let current = entity; current; current = world.getParent(current)) {
        if (current === ancestor) return true
      }
      return false
    }

    const hitsButton = (entity: bigint | undefined, ui: boolean) => {
      let belongsToButton = false
      let isUi = false
      for (let current = entity; current; current = world.getParent(current)) {
        if (ecs.Hidden.has(world, current) || ecs.Disabled.has(world, current)) return false
        if (current === eid) belongsToButton = true
        if (ecs.Ui.has(world, current)) isUi = true
      }
      return belongsToButton && isUi === ui
    }

    const switchPanels = () => {
      const {enabled, panelToActivate, panelToDeactivate} = schemaAttribute.get(eid)
      if (!enabled) return
      if (!panelToActivate || !panelToDeactivate ||
        !world.allEntities.has(panelToActivate) || !world.allEntities.has(panelToDeactivate)) {
        console.warn('Panel Switch Button: asigna dos paneles existentes en el Inspector.')
        return
      }
      if (panelToActivate === panelToDeactivate) {
        console.warn('Panel Switch Button: el panel a activar y el panel a desactivar deben ser distintos.')
        return
      }
      if (belongsTo(panelToActivate, panelToDeactivate) || belongsTo(panelToDeactivate, panelToActivate)) {
        console.warn('Panel Switch Button: los paneles no deben estar uno dentro del otro.')
        return
      }
      // Validate the destination before closing the current panel.
      for (let parent = world.getParent(panelToActivate); parent; parent = world.getParent(parent)) {
        if (ecs.Hidden.has(world, parent) || ecs.Disabled.has(world, parent)) {
          console.warn('Panel Switch Button: activa y muestra los padres del panel de destino.')
          return
        }
      }

      // The button itself may be a child of the panel being closed.
      if (!ecs.Disabled.has(world, panelToDeactivate)) ecs.Disabled.set(world, panelToDeactivate)
      if (ecs.Disabled.has(world, panelToActivate)) ecs.Disabled.remove(world, panelToActivate)
      if (ecs.Hidden.has(world, panelToActivate)) ecs.Hidden.remove(world, panelToActivate)
    }

    ecs.defineState('ready').initial()
      .onExit(() => taps.clear())
      .listen(world.events.globalId, ecs.input.UI_CLICK, event => {
        if (hitsButton(event.target, true)) switchPanels()
      })
      .listen(world.events.globalId, ecs.input.SCREEN_TOUCH_START, ({data}) => {
        taps.delete(data.pointerId)
        if (schemaAttribute.get(eid).enabled && hitsButton(data.target, false)) taps.add(data.pointerId)
      })
      .listen(world.events.globalId, ecs.input.SCREEN_TOUCH_MOVE, ({data}) => {
        const distance = Math.hypot(data.position.x - data.start.x, data.position.y - data.start.y)
        if (distance > maxTapMovement) taps.delete(data.pointerId)
      })
      .listen(world.events.globalId, ecs.input.GESTURE_START, ({data}) => {
        if (data.touchCount > 1) taps.clear()
      })
      .listen(world.events.globalId, ecs.input.SCREEN_TOUCH_END, ({data}) => {
        if (!taps.delete(data.pointerId)) return
        if (!hitsButton(data.target, false) || !hitsButton(data.endTarget, false)) return
        const distance = Math.hypot(data.position.x - data.start.x, data.position.y - data.start.y)
        if (distance <= maxTapMovement) switchPanels()
      })
  },
})

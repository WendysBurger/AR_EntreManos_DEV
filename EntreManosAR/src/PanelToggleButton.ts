import * as ecs from '@8thwall/ecs'

// Keep this button outside the target panel so it remains available when closed.
ecs.registerComponent({
  name: 'Panel Toggle Button',

  schema: {
    // @label Enabled
    enabled: ecs.boolean,
    // Panel or parent group to open and close with the same button.
    // @label Target Entity
    targetEntity: ecs.eid,
  },

  schemaDefaults: {
    enabled: true,
  },

  stateMachine: ({world, eid, schemaAttribute}) => {
    const taps = new Set<number>()
    const maxTapMovement = 0.025

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

    const togglePanel = () => {
      const {enabled, targetEntity} = schemaAttribute.get(eid)
      if (!enabled) return
      if (!targetEntity || !world.allEntities.has(targetEntity)) {
        console.warn('Panel Toggle Button: asigna un panel existente en Target Entity.')
        return
      }
      // Closing the button or one of its parents would prevent the next click.
      for (let current = eid; current; current = world.getParent(current)) {
        if (current === targetEntity) {
          console.warn('Panel Toggle Button: coloca el botón fuera del panel que abre y cierra.')
          return
        }
      }
      for (let parent = world.getParent(targetEntity); parent; parent = world.getParent(parent)) {
        if (ecs.Hidden.has(world, parent) || ecs.Disabled.has(world, parent)) {
          console.warn('Panel Toggle Button: los padres del panel deben estar activos y visibles.')
          return
        }
      }

      // Read the actual state each time, including changes made by other buttons.
      const closed = ecs.Disabled.has(world, targetEntity) || ecs.Hidden.has(world, targetEntity)
      if (closed) {
        if (ecs.Disabled.has(world, targetEntity)) ecs.Disabled.remove(world, targetEntity)
        if (ecs.Hidden.has(world, targetEntity)) ecs.Hidden.remove(world, targetEntity)
      } else {
        ecs.Disabled.set(world, targetEntity)
      }
    }

    ecs.defineState('ready').initial()
      .onExit(() => taps.clear())
      .listen(world.events.globalId, ecs.input.UI_CLICK, event => {
        if (hitsButton(event.target, true)) togglePanel()
      })
      .listen(world.events.globalId, ecs.input.SCREEN_TOUCH_START, ({data}) => {
        taps.delete(data.pointerId)
        // UI has its own click event; do not toggle twice for the same gesture.
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
        if (distance <= maxTapMovement) togglePanel()
      })
  },
})

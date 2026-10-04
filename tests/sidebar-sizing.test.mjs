import assert from 'node:assert/strict'
import { test } from 'node:test'
import { sidebarWidth, stepSidebarWidth } from '../src/layouts/music/sidebar/sidebarSizing.js'

test('left sidebar snaps between icon mode and the expanded range without intermediate widths', () => {
  assert.equal(sidebarWidth(72, true), 72)
  assert.equal(sidebarWidth(175, true), 72)
  assert.equal(sidebarWidth(176, true), 280)
  assert.equal(sidebarWidth(250, true), 280)
  assert.equal(sidebarWidth(350, true), 350)
  assert.equal(sidebarWidth(600, true), 420)
  assert.equal(sidebarWidth(-100, true), 72)
})

test('right sidebar remains between 280 and 420 pixels', () => {
  assert.equal(sidebarWidth(-100), 280)
  assert.equal(sidebarWidth(72), 280)
  assert.equal(sidebarWidth(350), 350)
  assert.equal(sidebarWidth(600), 420)
})

test('keyboard resizing can enter and leave collapsed mode and respects both limits', () => {
  assert.equal(stepSidebarWidth(280, -10, true), 72)
  assert.equal(stepSidebarWidth(72, 10, true), 280)
  assert.equal(stepSidebarWidth(72, -10, true), 72)
  assert.equal(stepSidebarWidth(300, -10, true), 290)
  assert.equal(stepSidebarWidth(420, 10, true), 420)
  assert.equal(stepSidebarWidth(280, -10), 280)
  assert.equal(stepSidebarWidth(420, 10), 420)
})

import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { PickupSystem } from '../src/weapons/pickups';
import { pickupCfg } from '../src/weapons/pickups';
import type { GameWorld } from '../src/core/types';

const world = () => ({ scene: new THREE.Scene(), vehicles: [] }) as unknown as GameWorld;

describe('PickupSystem.listDropped', () => {
  it('drop lar ro\'yxatda, maxDropped dan oshsa eng eskisi chiqadi, bir xil massiv qaytadi', () => {
    const ps = new PickupSystem(world(), []);
    const list = ps.listDropped();
    expect(list).toHaveLength(0);
    ps.drop(new THREE.Vector3(1, 2, 3), 'health');
    ps.drop(new THREE.Vector3(4, 5, 6), 'mortar');
    expect(ps.listDropped()).toBe(list);
    expect(list.map((p) => p.kind)).toEqual(['health', 'mortar']);
    expect(list[1]!.pos.toArray()).toEqual([4, 5, 6]);
    expect(list.every((p) => p.available)).toBe(true);
    for (let i = 0; i < pickupCfg.maxDropped; i++) ps.drop(new THREE.Vector3(i, 0, 0), 'rocket');
    expect(list).toHaveLength(pickupCfg.maxDropped);
    expect(list.every((p) => p.kind === 'rocket')).toBe(true);
    expect(ps.droppedCount).toBe(pickupCfg.maxDropped);
  });
});

import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { DialogsProvider } from './components/DialogsProvider'

function renderApp() {
  return render(
    <DialogsProvider>
      <App />
    </DialogsProvider>,
  )
}

describe('App shell', () => {
  it('renders the brand and an empty trains view', async () => {
    renderApp()
    expect(screen.getByRole('heading', { name: /Cargo/ })).toBeInTheDocument()
    expect(await screen.findByText(/No trains yet/i)).toBeInTheDocument()
  })

  it('switches sections', async () => {
    const user = userEvent.setup()
    renderApp()
    await user.click(screen.getByRole('button', { name: 'Train Stations' }))
    expect(screen.getByText(/No train stations yet/i)).toBeInTheDocument()
  })
})

describe('trains', () => {
  it('adds a train with a default consist', async () => {
    const user = userEvent.setup()
    renderApp()
    await user.click(screen.getByRole('button', { name: '+ Add train' }))
    expect(screen.getByDisplayValue('Train 1')).toBeInTheDocument()
    expect(screen.getByText('Engine')).toBeInTheDocument()
    expect(screen.getAllByText('Freight')).toHaveLength(2)
  })

  it('cycles a car type on click (freight → fluid)', async () => {
    const user = userEvent.setup()
    const { container } = renderApp()
    await user.click(screen.getByRole('button', { name: '+ Add train' }))
    expect(container.querySelector('.railcar.fluidcar')).toBeNull()
    await user.click(container.querySelector('.railcar.freight') as HTMLElement)
    expect(container.querySelector('.railcar.fluidcar')).not.toBeNull()
  })

  it('removing cars is disabled down to a single engine', async () => {
    const user = userEvent.setup()
    const { container } = renderApp()
    await user.click(screen.getByRole('button', { name: '+ Add train' }))
    const minus = screen.getByRole('button', { name: '− Car' })
    await user.click(minus)
    await user.click(minus)
    expect(container.querySelectorAll('.railcar')).toHaveLength(1)
    expect(minus).toBeDisabled()
  })
})

describe('stations & platforms', () => {
  it('adds a station and toggles a platform to unload', async () => {
    const user = userEvent.setup()
    renderApp()
    await user.click(screen.getByRole('button', { name: 'Train Stations' }))
    await user.click(screen.getByRole('button', { name: '+ Add train station' }))
    expect(screen.getByDisplayValue('Station 1')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Unload' }))
    expect(screen.getByText(/receives solids that docked trains drop here/i)).toBeInTheDocument()
  })
})

describe('trucks & truck stations', () => {
  it('adds a truck and switches it to a fluid truck', async () => {
    const user = userEvent.setup()
    renderApp()
    await user.click(screen.getByRole('button', { name: 'Trucks & routes' }))
    await user.click(screen.getByRole('button', { name: '+ Add truck' }))
    expect(screen.getByDisplayValue('Truck 1')).toBeInTheDocument()
    expect(screen.getByText(/carries solid items/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Fluid Truck' }))
    expect(screen.getByText(/carries one fluid/i)).toBeInTheDocument()
  })

  it('adds a truck station and toggles it to a fluid unload dock', async () => {
    const user = userEvent.setup()
    renderApp()
    await user.click(screen.getByRole('button', { name: 'Truck Stations' }))
    await user.click(screen.getByRole('button', { name: '+ Add truck station' }))
    expect(screen.getByDisplayValue('Truck Station 1')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Fluid' }))
    await user.click(screen.getByRole('button', { name: 'Unload' }))
    expect(screen.getByText(/receives a fluid that docked trucks drop here/i)).toBeInTheDocument()
  })
})

describe('drones & drone ports', () => {
  it('links a drone to a drone port', async () => {
    const user = userEvent.setup()
    renderApp()
    // a port first
    await user.click(screen.getByRole('button', { name: 'Drone Ports' }))
    await user.click(screen.getByRole('button', { name: '+ Add drone port' }))
    expect(screen.getByDisplayValue('Drone Port 1')).toBeInTheDocument()
    // then a drone
    await user.click(screen.getByRole('button', { name: 'Drones & routes' }))
    await user.click(screen.getByRole('button', { name: '+ Add drone' }))
    expect(screen.getByDisplayValue('Drone 1')).toBeInTheDocument()

    const [home, dest] = screen.getAllByRole('combobox')
    expect(dest).toBeDefined()
    await user.selectOptions(home, 'Drone Port 1')
    expect((within(home).getByRole('option', { name: 'Drone Port 1' }) as HTMLOptionElement).selected).toBe(true)
  })
})

describe('routes & rules', () => {
  it('adds a stop and pins a specific load item', async () => {
    const user = userEvent.setup()
    const { container } = renderApp()
    // need a station first
    await user.click(screen.getByRole('button', { name: 'Train Stations' }))
    await user.click(screen.getByRole('button', { name: '+ Add train station' }))
    // then a train + a stop
    await user.click(screen.getByRole('button', { name: 'Trains & routes' }))
    await user.click(screen.getByRole('button', { name: '+ Add train' }))
    await user.click(screen.getByRole('button', { name: '+ Add stop' }))

    const stopEl = container.querySelector('.stop') as HTMLElement
    const combos = within(stopEl).getAllByRole('combobox')
    // [0] stop station, [1] load mode, [2] unload mode
    expect(combos).toHaveLength(3)
    await user.selectOptions(combos[1], 'Specific items')

    // a "+ add item" select now appears inside the load rule
    const afterCombos = within(stopEl).getAllByRole('combobox')
    await user.selectOptions(afterCombos[2], 'Iron Ore')
    const chip = stopEl.querySelector('.chip.load')
    expect(chip?.textContent).toContain('Iron Ore')
  })
})

describe('inline delete', () => {
  it('deletes a card when the ✕ is confirmed in place', async () => {
    const user = userEvent.setup()
    renderApp()
    await user.click(screen.getByRole('button', { name: '+ Add train' }))
    expect(screen.getByDisplayValue('Train 1')).toBeInTheDocument()
    // the ✕ trigger swaps into a confirm/cancel pair; confirm removes the card
    await user.click(screen.getByRole('button', { name: 'Delete Train 1' }))
    await user.click(screen.getByRole('button', { name: 'Confirm delete' }))
    expect(screen.queryByDisplayValue('Train 1')).not.toBeInTheDocument()
  })

  it('keeps the card when the delete is cancelled', async () => {
    const user = userEvent.setup()
    renderApp()
    await user.click(screen.getByRole('button', { name: '+ Add train' }))
    await user.click(screen.getByRole('button', { name: 'Delete Train 1' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByDisplayValue('Train 1')).toBeInTheDocument()
    // reverted back to the ✕ trigger
    expect(screen.getByRole('button', { name: 'Delete Train 1' })).toBeInTheDocument()
  })
})

describe('dialogs', () => {
  it('confirms world deletion (and recreates the last world)', async () => {
    const user = userEvent.setup()
    renderApp()
    await user.click(screen.getByRole('button', { name: 'Delete world' }))
    expect(await screen.findByText('Delete world "World 1" and everything in it?')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'OK' }))
    expect(screen.getByRole('button', { name: 'World 1' })).toBeInTheDocument()
  })

  it('adds a world via the prompt dialog', async () => {
    const user = userEvent.setup()
    renderApp()
    await user.click(screen.getByRole('button', { name: '+' }))
    const input = await screen.findByRole('textbox')
    expect(input).toHaveValue('World 2')
    await user.click(screen.getByRole('button', { name: 'OK' }))
    expect(screen.getByRole('button', { name: 'World 2' })).toBeInTheDocument()
  })

  it('opens the export dialog with the world name in the title', async () => {
    const user = userEvent.setup()
    renderApp()
    await user.click(screen.getByRole('button', { name: 'Export JSON' }))
    expect(await screen.findByText('Export "World 1" as JSON')).toBeInTheDocument()
  })

  it('edits custom items from the world-bar dialog; they surface in item pickers', async () => {
    const user = userEvent.setup()
    const { container } = renderApp()
    await user.click(screen.getByRole('button', { name: 'Custom items' }))

    const ta = container.querySelector('textarea.customlist') as HTMLTextAreaElement
    await user.click(ta)
    await user.type(ta, 'Ficsit Merch{Enter}Coffee Cup')

    const dialog = ta.closest('dialog') as HTMLDialogElement
    await user.click(within(dialog).getByRole('button', { name: 'Close' }))

    await user.click(screen.getByRole('button', { name: 'Train Stations' }))
    await user.click(screen.getByRole('button', { name: '+ Add train station' }))

    // the regular/load platform's item picker now offers the custom items
    expect(screen.getByRole('option', { name: 'Ficsit Merch' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Coffee Cup' })).toBeInTheDocument()
  })
})

describe('analysis badge', () => {
  it('reflects warning count in the section nav', async () => {
    const user = userEvent.setup()
    renderApp()
    // a fresh train with no route produces exactly one warning
    await user.click(screen.getByRole('button', { name: '+ Add train' }))
    const analysisTab = screen.getByRole('button', { name: /Analysis/ })
    expect(within(analysisTab).getByText('1')).toBeInTheDocument()
  })
})

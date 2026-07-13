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
    expect(screen.getByRole('heading', { name: /Rail/ })).toBeInTheDocument()
    expect(await screen.findByText(/No trains yet/i)).toBeInTheDocument()
  })

  it('switches sections', async () => {
    const user = userEvent.setup()
    renderApp()
    await user.click(screen.getByRole('button', { name: 'Stations' }))
    expect(screen.getByText(/No stations yet/i)).toBeInTheDocument()
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
    await user.click(screen.getByRole('button', { name: 'Stations' }))
    await user.click(screen.getByRole('button', { name: '+ Add station' }))
    expect(screen.getByDisplayValue('Station 1')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Unload' }))
    expect(screen.getByText(/receives solids that docked trains drop here/i)).toBeInTheDocument()
  })
})

describe('routes & rules', () => {
  it('adds a stop and pins a specific load item', async () => {
    const user = userEvent.setup()
    const { container } = renderApp()
    // need a station first
    await user.click(screen.getByRole('button', { name: 'Stations' }))
    await user.click(screen.getByRole('button', { name: '+ Add station' }))
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

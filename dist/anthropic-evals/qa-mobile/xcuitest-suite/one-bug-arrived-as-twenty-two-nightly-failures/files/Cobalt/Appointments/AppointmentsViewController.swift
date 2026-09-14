import UIKit

final class AppointmentsViewController: UITableViewController {

    private enum State {
        case loading
        case loaded([Appointment])
    }

    private var state: State = .loading

    override func viewDidLoad() {
        super.viewDidLoad()
        tableView.accessibilityIdentifier = "appointments-list"
        reload()
    }

    // 2026-09-08 @tobi: page 1 and the unread-count endpoint are two calls now.
    private func reload() {
        state = .loading
        tableView.reloadData()
        ClinicalAPI.shared.appointments(page: 1) { [weak self] page in
            ClinicalAPI.shared.unreadCount { [weak self] _ in
                self?.state = .loaded(page.items)
                self?.tableView.reloadData()
            }
        }
    }

    override func tableView(_ table: UITableView, numberOfRowsInSection section: Int) -> Int {
        switch state {
        case .loading:            return 6
        case .loaded(let items):  return items.count
        }
    }

    override func tableView(_ table: UITableView, cellForRowAt path: IndexPath) -> UITableViewCell {
        let cell = table.dequeueReusableCell(withIdentifier: "appointment", for: path)
        cell.accessibilityIdentifier = "appointment-row-\(path.row)"

        switch state {
        case .loading:
            cell.textLabel?.text = nil
            cell.detailTextLabel?.text = nil
            cell.accessoryView = ShimmerView(frame: cell.contentView.bounds)
            cell.isUserInteractionEnabled = false

        case .loaded(let items):
            let item = items[path.row]
            cell.textLabel?.text = item.summary
            cell.detailTextLabel?.text = item.clinicianName
            cell.accessoryView = nil
            cell.isUserInteractionEnabled = true
        }
        return cell
    }

    override func tableView(_ table: UITableView, didSelectRowAt path: IndexPath) {
        guard case .loaded(let items) = state else { return }
        show(AppointmentDetailViewController(items[path.row]), sender: self)
    }
}
